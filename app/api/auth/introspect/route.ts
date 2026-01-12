/**
 * POST /api/oauth/introspect
 * OAuth 2.0 Token Introspection (RFC 7662)
 *
 * Allows resource servers to validate and inspect access tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { oauthService } from "@/lib/services";
import { IntrospectTokenSchema } from "@/lib/domain/oauth";

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

  return IntrospectTokenSchema.safeParse(rawData);
}

export async function POST(request: NextRequest) {
  try {
    const parseResult = await parseRequest(request);

    // Return inactive for invalid request
    if (!parseResult.success) {
      return NextResponse.json({ active: false });
    }

    const { token } = parseResult.data;

    const result = await oauthService.introspectToken(token);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Token introspection error:", error);
    return NextResponse.json({ active: false });
  }
}
