/**
 * POST /api/oauth/login
 * OAuth 2.0 User Login
 *
 * Authenticates users with email/password and returns OAuth tokens.
 * Sets session cookie for web UI access.
 */

import { NextRequest, NextResponse } from "next/server";
import { oauthService, OAuthError } from "@/lib/services";
import { LoginSchema } from "@/lib/domain/auth";
import { getClientIp, getUserAgent } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dto = LoginSchema.parse(body);

    const result = await oauthService.login(dto, {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Create response with OAuth-style token response
    const response = NextResponse.json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      expires_at: result.expiresAt,
      user: result.user,
      organization: result.organization,
    });

    // Set session cookie for web UI
    response.cookies.set("session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof OAuthError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }

    // Handle Zod validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Invalid request format" },
        { status: 400 }
      );
    }

    console.error("OAuth login error:", error);
    return NextResponse.json(
      { error: "server_error", error_description: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
