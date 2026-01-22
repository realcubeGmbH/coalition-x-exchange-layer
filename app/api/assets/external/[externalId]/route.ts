/**
 * Assets by External ID API Route
 *
 * GET /api/assets/external/:externalId - Get asset by external ID with KPIs
 */

import { NextResponse } from "next/server";
import { withAuth, type ApiHandler } from "@/lib/api-auth";
import { handleError, ApiError } from "@/lib/core/ErrorHandler";
import { assetService } from "@/lib/services";
import { kpiService } from "@/lib/kpi";

// =============================================================================
// GET - Get Asset by External ID with KPIs
// =============================================================================

const handleGet: ApiHandler = async (request, auth, context) => {
  try {
    const { externalId } = await context.params;

    if (!externalId) {
      throw ApiError.missingField("externalId");
    }

    // Get URL params for KPI pagination
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get asset by external ID (org-scoped)
    const assetDetails = await assetService.getByExternalId(
      externalId,
      auth.organizationId!
    );

    // Get KPI history for this asset
    const kpiHistory = await kpiService.listKpiHistoryWithSchema({
      assetId: assetDetails.id,
      organizationId: auth.organizationId!,
      limit,
      offset,
    });

    // Return asset data + KPIs
    return NextResponse.json({
      data: {
        asset: assetDetails,
        kpis: kpiHistory.data,
        pagination: kpiHistory.pagination,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// Route Exports
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["assets:read", "kpis:read"],
});
