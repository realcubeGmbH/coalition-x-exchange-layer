/**
 * POST /api/auth/token
 * Exchange API key for OAuth access token (Partner API flow)
 *
 * Flow: Partner sends API key → receives JWT access token + refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  validateApiKey,
  createTokenPair,
  generateApiKey,
  hashToken,
} from "@/lib/auth";

/**
 * POST - Exchange API key for access token
 */
export async function POST(request: NextRequest) {
  try {
    // Extract API key from header (AC2: Source Validation)
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Missing X-API-Key header",
          code: "MISSING_API_KEY",
        },
        { status: 401 }
      );
    }

    // Validate API key
    const organization = await validateApiKey(apiKey);

    if (!organization) {
      // Log failed attempt (AC5: Logging)
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      console.warn(`Invalid API key attempt from ${ipAddress}`);

      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Invalid or revoked API key",
          code: "INVALID_API_KEY",
        },
        { status: 401 }
      );
    }

    // Check organization type (only ACCREDITED_PARTNER can use API)
    if (organization.type !== "ACCREDITED_PARTNER") {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "API access requires Accredited Partner status",
          code: "NOT_ACCREDITED",
        },
        { status: 403 }
      );
    }

    // Get scopes for partner API access
    const scopes: Array<
      "buildings:read" | "buildings:write" | "kpis:read" | "kpis:write"
    > = ["buildings:read", "buildings:write", "kpis:read", "kpis:write"];

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Generate tokens (no user - organization-level API access)
    const tokens = await createTokenPair({
      userId: `org:${organization.id}`, // Special format for org-level tokens
      organizationId: organization.id,
      role: "PARTNER_API",
      scopes,
      name: "API key exchange",
      ipAddress,
    });

    // Log token creation (AC5: Logging)
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "API_TOKEN_CREATED",
        resource: "api_token",
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: "Bearer",
      expiresIn: 3600, // 1 hour in seconds
      expiresAt: tokens.expiresAt.toISOString(),
      scope: scopes.join(" "),
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper endpoint to generate API key for testing (remove in production)
 * POST with { organizationId: string } to generate a key
 */
export async function PUT(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId required" },
        { status: 400 }
      );
    }

    const apiKey = generateApiKey();

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        apiKey: apiKey.slice(-8), // Store partial for identification
        apiKeyHash: hashToken(apiKey),
      },
    });

    return NextResponse.json({
      apiKey,
      message: "Store this key securely - it cannot be retrieved again",
    });
  } catch (error) {
    console.error("API key generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }
}
