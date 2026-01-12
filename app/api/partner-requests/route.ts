/**
 * Partner Requests API
 *
 * POST /api/partner-requests - Submit application (PUBLIC - no auth)
 * GET  /api/partner-requests - List applications (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type ApiHandler } from "@/lib/api-auth";
import { partnerRequestService } from "@/lib/services";
import {
  CreatePartnerRequestSchema,
  ListPartnerRequestsQuerySchema,
} from "@/lib/domain/partner-request";
import { handleError } from "@/lib/core/ErrorHandler";

// =============================================================================
// POST - Submit Application (PUBLIC - No Auth Required)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dto = CreatePartnerRequestSchema.parse(body);

    const result = await partnerRequestService.submitApplication(dto);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// GET - List Applications (Admin Only)
// =============================================================================

const handleGet: ApiHandler = async (request) => {
  const url = new URL(request.url);

  const query = ListPartnerRequestsQuerySchema.parse({
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? 20,
  });

  const result = await partnerRequestService.list(query);

  return NextResponse.json({
    applications: result.data,
    pagination: result.pagination,
  });
};

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:users"],
});
