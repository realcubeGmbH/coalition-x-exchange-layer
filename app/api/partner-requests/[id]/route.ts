/**
 * Single Partner Request API
 *
 * GET  /api/partner-requests/:id - Get application details (Admin)
 * POST /api/partner-requests/:id - Review application (Admin)
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { partnerRequestService } from "@/lib/services/partner-request.service";
import { ReviewPartnerRequestSchema } from "@/lib/domain/partner-request";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// GET - Get Application Details
// =============================================================================

const handleGet: ApiHandler = async (_request, _auth, context) => {
  const { id } = await context.params;

  const application = await partnerRequestService.getById(id);

  return NextResponse.json({ application });
};

// =============================================================================
// POST - Review Application (Approve/Reject)
// =============================================================================

const handlePost: ApiHandler = async (request, auth, context) => {
  const { id } = await context.params;

  const body = await request.json();
  const dto = ReviewPartnerRequestSchema.parse(body);

  const ctx = createServiceContext({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    isOrgLevel: auth.isOrgLevel,
    isSystemAdmin: auth.isSystemAdmin,
  });

  const result = await partnerRequestService.review(id, dto, ctx);

  return NextResponse.json(result);
};

// =============================================================================
// Exports
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:users"],
});

export const POST = withAuth(handlePost, {
  requiredScopes: ["admin:users"],
});
