/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

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
        // Log logout (AC5: Logging)
        await prisma.auditLog.create({
          data: {
            organizationId: payload.orgId,
            userId: payload.sub.startsWith("org:") ? undefined : payload.sub,
            action: "AUTH_LOGOUT",
            resource: "user",
            resourceId: payload.sub,
            ipAddress:
              request.headers.get("x-forwarded-for")?.split(",")[0] ||
              "unknown",
            userAgent: request.headers.get("user-agent"),
          },
        });
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
