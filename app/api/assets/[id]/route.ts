/**
 * Single Asset API Routes
 *
 * GET    /api/assets/:id - Get asset details
 * PATCH  /api/assets/:id - Update asset
 * DELETE /api/assets/:id - Delete asset
 */

import { NextResponse } from "next/server";
import {
  withAuth,
  type ApiHandler,
  getClientIp,
  getUserAgent,
} from "@/lib/api-auth";
import { assetService } from "@/lib/services";
import { UpdateAssetSchema } from "@/lib/domain/asset";
import { createServiceContext } from "@/lib/domain/shared";
import { handleError } from "@/lib/core/ErrorHandler";

// =============================================================================
// GET - Get Asset Details
// =============================================================================

const handleGet: ApiHandler = async (_request, auth, context) => {
  try {
    const { id } = await context.params;

    const asset = await assetService.getById(id, auth.organizationId!);

    return NextResponse.json({ data: asset });
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// PATCH - Update Asset
// =============================================================================

const handlePatch: ApiHandler = async (request, auth, context) => {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const dto = UpdateAssetSchema.parse(body);

    const ctx = createServiceContext({
      userId: auth.userId,
      organizationId: auth.organizationId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      isOrgLevel: auth.isOrgLevel,
      isSystemAdmin: auth.isSystemAdmin,
    });

    const asset = await assetService.update(id, dto, ctx);

    return NextResponse.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// DELETE - Delete Asset
// =============================================================================

const handleDelete: ApiHandler = async (request, auth, context) => {
  try {
    const { id } = await context.params;

    const ctx = createServiceContext({
      userId: auth.userId,
      organizationId: auth.organizationId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      isOrgLevel: auth.isOrgLevel,
      isSystemAdmin: auth.isSystemAdmin,
    });

    await assetService.delete(id, ctx);

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully",
    });
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

export const PATCH = withAuth(handlePatch, {
  requiredScopes: ["assets:write"],
});

export const DELETE = withAuth(handleDelete, {
  requiredScopes: ["assets:write"],
});
