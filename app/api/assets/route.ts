/**
 * Assets API Routes
 *
 * GET  /api/assets - List assets (org-scoped)
 * POST /api/assets - Create asset
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { assetService } from "@/lib/services";
import { CreateAssetSchema, ListAssetsQuerySchema } from "@/lib/domain/asset";
import { createServiceContext } from "@/lib/domain/shared";
import { handleError } from "@/lib/core/ErrorHandler";

// =============================================================================
// GET - List Assets
// =============================================================================

const handleGet: ApiHandler = async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url);

    const query = ListAssetsQuerySchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const result = await assetService.list(auth.organizationId!, query);

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// POST - Create Asset
// =============================================================================

const handlePost: ApiHandler = async (request, auth) => {
  try {
    const body = await request.json();
    const dto = CreateAssetSchema.parse(body);

    const ctx = createServiceContext({
      userId: auth.userId,
      organizationId: auth.organizationId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      isOrgLevel: auth.isOrgLevel,
      isSystemAdmin: auth.isSystemAdmin,
    });

    const asset = await assetService.create(dto, ctx);

    return NextResponse.json(
      {
        success: true,
        data: asset,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// Route Exports
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["assets:read"],
});

export const POST = withAuth(handlePost, {
  requiredScopes: ["assets:write"],
});
