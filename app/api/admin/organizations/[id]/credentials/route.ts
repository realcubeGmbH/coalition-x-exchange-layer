/**
 * POST /api/admin/organizations/[id]/credentials
 * Generate OAuth 2.0 client credentials for an organization (Admin only)
 *
 * This generates a new client_secret for the organization.
 * The client_id is auto-generated when the org is created.
 *
 * ⚠️  The client_secret is only shown ONCE in the response.
 *     It is hashed before storage and cannot be retrieved again.
 */

import { NextResponse } from "next/server";
import { withAuth, type ApiHandler, getClientIp, getUserAgent } from "@/lib/api-auth";
import { organizationService } from "@/lib/services";
import { GenerateCredentialsSchema } from "@/lib/domain/organization";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// POST - Generate/Rotate Client Credentials
// =============================================================================

const handlePost: ApiHandler = async (request, auth, context) => {
  const { id } = await context.params;

  // Parse optional body for rotation
  let rotate = false;
  try {
    const body = await request.json();
    const parsed = GenerateCredentialsSchema.parse(body);
    rotate = parsed.rotate ?? false;
  } catch {
    // No body or invalid JSON is fine - default to not rotating
  }

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  const credentials = await organizationService.generateCredentials(id, rotate, ctx);

  return NextResponse.json(
    {
      message: rotate
        ? "Credentials rotated successfully. Old credentials and tokens are now invalid."
        : "OAuth credentials generated successfully",
      credentials: {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
      warning: "⚠️  Save the client_secret NOW! It will not be shown again.",
      usage: {
        tokenEndpoint: "/api/oauth/token",
        grantType: "client_credentials",
        example: `curl -X POST {{BASE_URL}}/api/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=${credentials.clientId}" \\
  -d "client_secret=${credentials.clientSecret}"`,
      },
    },
    { status: rotate ? 200 : 201 }
  );
};

// =============================================================================
// GET - Check Credentials Status
// =============================================================================

const handleGet: ApiHandler = async (_request, _auth, context) => {
  const { id } = await context.params;

  const status = await organizationService.getCredentialsStatus(id);

  return NextResponse.json({
    credentials: status,
    actions: status.hasCredentials
      ? {
          rotate: `POST /api/admin/organizations/${id}/credentials with body: { "rotate": true }`,
          note: "Rotating will invalidate all existing tokens",
        }
      : {
          generate: `POST /api/admin/organizations/${id}/credentials`,
        },
  });
};

// =============================================================================
// Export with Auth
// =============================================================================

export const POST = withAuth(handlePost, {
  requiredScopes: ["admin:tokens"],
});

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:tokens"],
});
