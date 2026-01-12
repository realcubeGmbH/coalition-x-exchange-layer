/**
 * POST /api/oauth/token
 * OAuth 2.0 Token Endpoint
 *
 * Supports:
 * - client_credentials grant (M2M authentication via client_id + client_secret)
 * - refresh_token grant (token refresh)
 * - api_key grant (legacy API key exchange)
 * - X-API-Key header (backward compatibility for API key exchange)
 */

import { NextRequest, NextResponse } from "next/server";
import { oauthService, OAuthError } from "@/lib/services";
import { OAuthTokenRequestSchema } from "@/lib/domain/oauth";
import { getClientIp, getUserAgent } from "@/lib/api-auth";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * OAuth 2.0 Error Response
 */
function oauthError(
  error: string,
  description: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status }
  );
}

/**
 * Parse request body (supports both form-urlencoded and JSON)
 */
async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let rawData: Record<string, unknown>;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    rawData = {
      grant_type: formData.get("grant_type") ?? undefined,
      client_id: formData.get("client_id") ?? undefined,
      client_secret: formData.get("client_secret") ?? undefined,
      refresh_token: formData.get("refresh_token") ?? undefined,
      api_key: formData.get("api_key") ?? undefined,
      scope: formData.get("scope") ?? undefined,
    };
  } else {
    rawData = await request.json();
  }

  return rawData;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const ctx = {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    };

    // Check for X-API-Key header first (backward compatibility)
    const apiKeyHeader = request.headers.get("x-api-key");
    if (apiKeyHeader) {
      const result = await oauthService.apiKeyGrant(apiKeyHeader, ctx);
      return NextResponse.json(result);
    }

    // Parse request body
    const rawData = await parseRequest(request);

    // Handle api_key grant type
    if (rawData.grant_type === "api_key") {
      const apiKey = rawData.api_key as string | undefined;
      if (!apiKey) {
        return oauthError("invalid_request", "api_key is required for api_key grant");
      }
      const result = await oauthService.apiKeyGrant(apiKey, ctx);
      return NextResponse.json(result);
    }

    // Validate standard OAuth request format
    const parseResult = OAuthTokenRequestSchema.safeParse(rawData);
    if (!parseResult.success) {
      return oauthError("invalid_request", "Invalid request format or missing grant_type");
    }

    const { grant_type, client_id, client_secret, refresh_token, scope } = parseResult.data;

    // Handle refresh_token grant
    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        return oauthError("invalid_request", "refresh_token is required");
      }

      const result = await oauthService.refreshTokenGrant(refresh_token);
      return NextResponse.json(result);
    }

    // Handle client_credentials grant
    if (grant_type === "client_credentials") {
      if (!client_id || !client_secret) {
        return oauthError("invalid_request", "client_id and client_secret are required");
      }

      const result = await oauthService.clientCredentialsGrant(
        client_id,
        client_secret,
        scope,
        ctx
      );
      return NextResponse.json(result);
    }

    return oauthError(
      "unsupported_grant_type",
      "Supported grant types: client_credentials, refresh_token, api_key"
    );
  } catch (error) {
    if (error instanceof OAuthError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }

    console.error("OAuth token error:", error);
    return oauthError("server_error", "An unexpected error occurred", 500);
  }
}
