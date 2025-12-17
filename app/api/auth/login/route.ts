/**
 * POST /api/auth/login
 * User login endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createTokenPair, TokenScope } from "@/lib/auth";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate required fields (AC2: Format Validation → 400)
    if (!email || !password) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Email and password are required",
          code: "MISSING_CREDENTIALS",
        },
        { status: 400 }
      );
    }

    // Find user with organization
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    // Generic error to prevent user enumeration
    if (!user) {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      // Log failed attempt (AC5: Logging)
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "AUTH_FAILED",
          resource: "user",
          resourceId: user.id,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      });

      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Check organization status (AC2: Source Validation)
    if (user.organization.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "Organization is not active",
          code: "ORG_INACTIVE",
        },
        { status: 403 }
      );
    }

    // Determine scopes based on role
    const scopes = getScopesForRole(user.role);

    // Generate tokens
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const tokens = await createTokenPair({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      scopes,
      name: "Web login",
      ipAddress,
    });

    // Log successful login (AC5: Logging)
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "AUTH_LOGIN",
        resource: "user",
        resourceId: user.id,
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Return success response
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
    });

    // Set session cookie for web UI
    response.cookies.set("session", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
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
 * Get scopes based on user role (per authorization matrix)
 */
function getScopesForRole(role: string): TokenScope[] {
  const baseScopes: TokenScope[] = ["buildings:read", "kpis:read"];

  switch (role) {
    case "ADMIN":
      return [
        ...baseScopes,
        "buildings:write",
        "buildings:delete",
        "kpis:write",
        "admin:users",
        "admin:tokens",
        "admin:audit",
      ];
    case "PARTNER_ADMIN":
      return [
        ...baseScopes,
        "buildings:write",
        "buildings:delete",
        "kpis:write",
        "admin:tokens",
        "admin:audit",
      ];
    case "PARTNER_USER":
      return [...baseScopes, "buildings:write", "kpis:write"];
    case "CLIENT_ADMIN":
      return [
        ...baseScopes,
        "buildings:write",
        "buildings:delete",
        "kpis:write",
        "admin:audit",
      ];
    case "CLIENT_USER":
      return [...baseScopes, "buildings:write", "kpis:write"];
    default:
      return baseScopes;
  }
}
