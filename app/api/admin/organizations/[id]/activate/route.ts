/**
 * POST /api/admin/organizations/[id]/activate
 * Activate a pending organization (Admin only)
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { organizationService } from "@/lib/services";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// POST - Activate Organization
// =============================================================================

const handlePost: ApiHandler = async (request, auth, context) => {
  const { id } = await context.params;

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  const organization = await organizationService.activate(id, ctx);

  return NextResponse.json({
    message: "Organization activated successfully",
    organization,
    nextStep:
      organization.type === "ACCREDITED_PARTNER"
        ? `Generate OAuth credentials: POST /api/admin/organizations/${id}/credentials`
        : "Organization is ready for use",
  });
};

// =============================================================================
// Export with Auth
// =============================================================================

export const POST = withAuth(handlePost, {
  requiredScopes: ["admin:users"],
});
