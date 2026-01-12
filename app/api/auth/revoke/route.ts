/**
 * POST /api/oauth/revoke
 * OAuth 2.0 Token Revocation (RFC 7009)
 *
 * Allows clients to revoke access or refresh tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { oauthService } from "@/lib/services";
import { RevokeTokenSchema } from "@/lib/domain/oauth";
import { getClientIp, getUserAgent } from "@/lib/api-auth";

/**
 * Parse request body (supports both form-urlencoded and JSON)
 */
async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let rawData: Record<string, unknown>;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    rawData = {
      token: formData.get("token") ?? undefined,
      token_type_hint: formData.get("token_type_hint") ?? undefined,
    };
  } else {
    rawData = await request.json();
  }

  return RevokeTokenSchema.safeParse(rawData);
}

export async function POST(request: NextRequest) {
  try {
    const parseResult = await parseRequest(request);

    // Per RFC 7009: always return 200, even if request is invalid
    if (!parseResult.success) {
      return new NextResponse(null, { status: 200 });
    }

    const { token, token_type_hint } = parseResult.data;

    await oauthService.revokeToken(token, token_type_hint, {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Always return 200 per RFC 7009
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Token revocation error:", error);
    // Still return 200 per spec
    return new NextResponse(null, { status: 200 });
  }
}
