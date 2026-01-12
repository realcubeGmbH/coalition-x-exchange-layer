/**
 * POST /api/oauth/logout
 * OAuth 2.0 Logout
 *
 * Logs out user and clears session cookie.
 * For token revocation, use POST /api/oauth/revoke instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { oauthService } from "@/lib/services";
import { verifyAccessToken } from "@/lib/auth";
import { getClientIp, getUserAgent } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie or Authorization header
    const sessionToken = request.cookies.get("session")?.value;
    const authHeader = request.headers.get("authorization");
    const token = sessionToken || authHeader?.slice(7);

    if (token) {
      // Verify token to get user info for logging
      const payload = await verifyAccessToken(token);

      if (payload) {
        await oauthService.logout(
          payload.sub.startsWith("org:") ? null : payload.sub,
          payload.orgId,
          {
            ipAddress: getClientIp(request),
            userAgent: getUserAgent(request),
          }
        );
      }
    }

    // Clear session cookie
    const response = NextResponse.json({
      message: "Logged out successfully",
    });

    response.cookies.delete("session");

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Still clear the cookie even if there's an error
    const response = NextResponse.json({
      message: "Logged out",
    });
    response.cookies.delete("session");

    return response;
  }
}
