/**
 * Asset KPIs API Routes
 *
 * GET  /api/assets/:id/kpis - Get KPI history for asset
 * POST /api/assets/:id/kpis - Submit new KPI data
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { ApiError, handleError } from "@/lib/core/ErrorHandler";
import { kpiService } from "@/lib/kpi";
import { createServiceContext } from "@/lib/domain/shared";

// =============================================================================
// GET /api/assets/:id/kpis - Get KPI history
// =============================================================================

const handleGet: ApiHandler = async (request, auth, context) => {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const version = url.searchParams.get("version");

    // If specific version requested
    if (version) {
      const record = await kpiService.getKpiVersionWithSchema(
        id,
        parseInt(version),
        auth.organizationId!
      );
      return NextResponse.json({ data: record });
    }

    // Get history
    const result = await kpiService.listKpiHistoryWithSchema({
      assetId: id,
      organizationId: auth.organizationId!,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// POST /api/assets/:id/kpis - Submit KPI data
// =============================================================================

const handlePost: ApiHandler = async (request, auth, context) => {
  try {
    const { id } = await context.params;

    // Parse body
    let body: {
      schema_version?: string;
      kpis: Record<string, unknown>;
      idempotency_key?: string;
    };
    try {
      body = await request.json();
    } catch {
      throw ApiError.invalidJson();
    }

    if (!body.kpis) {
      throw ApiError.missingField("kpis");
    }

    const ctx = createServiceContext({
      userId: auth.userId,
      organizationId: auth.organizationId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      isOrgLevel: auth.isOrgLevel,
      isSystemAdmin: auth.isSystemAdmin,
    });

    const result = await kpiService.submitKpiWithValidation({
      assetId: id,
      organizationId: auth.organizationId!,
      kpis: body.kpis,
      schemaVersion: body.schema_version,
      idempotencyKey: body.idempotency_key,
      ctx,
    });

    return NextResponse.json(
      {
        data: result.data,
        transactionId: result.transactionId,
        ...(result.idempotent && { idempotent: true }),
      },
      { status: result.status }
    );
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// Route Exports
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["kpis:read"],
});

export const POST = withAuth(handlePost, {
  requiredScopes: ["kpis:write"],
});
