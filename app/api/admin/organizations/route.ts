/**
 * /api/admin/organizations
 * Organization management endpoints (Admin only)
 *
 * GET  - List all organizations
 * POST - Create a new organization
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type ApiHandler, getClientIp, getUserAgent } from "@/lib/api-auth";
import { organizationService } from "@/lib/services";
import {
  CreateOrganizationSchema,
  ListOrganizationsQuerySchema,
} from "@/lib/domain/organization";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// GET - List Organizations
// =============================================================================

const handleGet: ApiHandler = async (request, auth) => {
  const url = new URL(request.url);

  const query = ListOrganizationsQuerySchema.parse({
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? 20,
  });

  const result = await organizationService.list(query);

  return NextResponse.json({
    organizations: result.data,
    pagination: result.pagination,
  });
};

// =============================================================================
// POST - Create Organization
// =============================================================================

const handlePost: ApiHandler = async (request, auth) => {
  const body = await request.json();
  const dto = CreateOrganizationSchema.parse(body);

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  const result = await organizationService.create(dto, ctx);
  const { credentials, ...organization } = result;

  // Build response based on whether credentials were generated
  const response: Record<string, unknown> = {
    message: "Organization created and activated successfully",
      organization,
  };

  if (credentials) {
    response.credentials = {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    };
    response.warning = "⚠️  Save the client_secret NOW! It will not be shown again.";
    response.usage = {
      tokenEndpoint: "/api/oauth/token",
      grantType: "client_credentials",
    };
  }

  return NextResponse.json(response, { status: 201 });
};

// =============================================================================
// Export with Auth
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:users"],
});

export const POST = withAuth(handlePost, {
  requiredScopes: ["admin:users"],
});
