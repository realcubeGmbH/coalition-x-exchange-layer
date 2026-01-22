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

    // Get asset by external ID (org-scoped)
    const assetDetails = await assetService.getByExternalId(
      externalId,
      auth.organizationId!
    );

    // Get only the latest KPI submission (highest data version)
    const kpiHistory = await kpiService.listKpiHistoryWithSchema({
      assetId: assetDetails.id,
      organizationId: auth.organizationId!,
      limit: 1,
      offset: 0,
    });

    // Return asset data + latest KPI (or null if none exists)
    return NextResponse.json({
      data: {
        asset: assetDetails,
        kpis: kpiHistory.data.length > 0 ? kpiHistory.data[0] : null,
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
