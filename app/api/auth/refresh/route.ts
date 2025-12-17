/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth";

interface RefreshRequest {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    // Validate required field (AC2: Format Validation)
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Refresh token is required",
          code: "MISSING_REFRESH_TOKEN",
        },
        { status: 400 }
      );
    }

    // Attempt to refresh
    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Invalid or expired refresh token",
          code: "INVALID_REFRESH_TOKEN",
        },
        { status: 401 }
      );
    }

    // Return new access token
    const response = NextResponse.json({
      accessToken: result.accessToken,
      expiresAt: result.expiresAt.toISOString(),
    });

    // Update session cookie for web UI
    response.cookies.set("session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
