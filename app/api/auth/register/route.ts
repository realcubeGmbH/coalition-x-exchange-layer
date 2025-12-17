/**
 * POST /api/auth/register
 * User registration endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  hashPassword,
  validatePasswordStrength,
  createTokenPair,
} from "@/lib/auth";

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name, organizationName } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Missing required fields",
          details: {
            email: !email ? "Email is required" : null,
            password: !password ? "Password is required" : null,
            name: !name ? "Name is required" : null,
          },
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Password does not meet requirements",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if user already exists (AC1: Duplicate Detection → 409)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "conflict",
          message: "User with this email already exists",
          code: "USER_EXISTS",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create organization and user in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create organization (CLIENT type for self-registration)
        const organization = await tx.organization.create({
          data: {
            name: organizationName || `${name}'s Organization`,
            type: "CLIENT",
            status: "ACTIVE",
          },
        });

        // Create user
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            name,
            passwordHash,
            role: "CLIENT_ADMIN", // First user is admin
            organizationId: organization.id,
          },
        });

        return { user, organization };
      }
    );

    // Generate tokens
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const tokens = await createTokenPair({
      userId: result.user.id,
      organizationId: result.organization.id,
      role: result.user.role,
      scopes: ["buildings:read", "buildings:write", "kpis:read", "kpis:write"],
      name: "Initial login",
      ipAddress,
    });

    // Log registration (AC5: Logging)
    await prisma.auditLog.create({
      data: {
        organizationId: result.organization.id,
        userId: result.user.id,
        action: "AUTH_LOGIN",
        resource: "user",
        resourceId: result.user.id,
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Return success response
    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      },
      { status: 201 }
    );

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
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
