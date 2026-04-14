/**
 * Partner Sync API
 *
 * POST /api/partner-requests - Receive accredited partner data from POM+
 *
 * Authenticated endpoint — requires OAuth Bearer token with partner:org-sync scope.
 * Creates an accredited partner Organization + User and returns credentials.
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { partnerSyncService } from "@/lib/services/partner-request.service";
import { PartnerSyncSchema } from "@/lib/domain/partner-request";
import { createServiceContext } from "@/lib/domain/shared";
import { handleError } from "@/lib/core/ErrorHandler";

// =============================================================================
// POST - Receive Partner Sync (POM+ only)
// =============================================================================

const handlePost: ApiHandler = async (request, auth) => {
  try {
    const body = await request.json();
    const dto = PartnerSyncSchema.parse(body);

    const ctx = createServiceContext({
      userId: auth.userId,
      organizationId: auth.organizationId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      isOrgLevel: auth.isOrgLevel,
      isSystemAdmin: auth.isSystemAdmin,
    });

    const result = await partnerSyncService.sync(dto, ctx);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

export const POST = withAuth(handlePost, {
  requiredScopes: ["partner:org-sync"],
});
