/**
 * /api/admin/organizations/[id]
 * Single organization management (Admin only)
 *
 * GET    - Get organization details
 * PATCH  - Update organization
 * DELETE - Delete organization (soft delete)
 */

import { NextResponse } from "next/server";
import { withAuth, type ApiHandler, getClientIp, getUserAgent } from "@/lib/api-auth";
import { organizationService } from "@/lib/services";
import { UpdateOrganizationSchema } from "@/lib/domain/organization";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// GET - Get Organization Details
// =============================================================================

const handleGet: ApiHandler = async (_request, _auth, context) => {
  const { id } = await context.params;

  const organization = await organizationService.getById(id);

  return NextResponse.json({ organization });
};

// =============================================================================
// PATCH - Update Organization
// =============================================================================

const handlePatch: ApiHandler = async (request, auth, context) => {
  const { id } = await context.params;

  const body = await request.json();
  const dto = UpdateOrganizationSchema.parse(body);

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  const organization = await organizationService.update(id, dto, ctx);

  return NextResponse.json({
    message: "Organization updated successfully",
    organization,
  });
};

// =============================================================================
// DELETE - Soft Delete Organization
// =============================================================================

const handleDelete: ApiHandler = async (request, auth, context) => {
  const { id } = await context.params;

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  await organizationService.delete(id, ctx);

  return NextResponse.json({
    message: "Organization deactivated successfully",
    note: "All associated API tokens have been revoked",
  });
};

// =============================================================================
// Export with Auth
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:users"],
});

export const PATCH = withAuth(handlePatch, {
  requiredScopes: ["admin:users"],
});

export const DELETE = withAuth(handleDelete, {
  requiredScopes: ["admin:users"],
});
