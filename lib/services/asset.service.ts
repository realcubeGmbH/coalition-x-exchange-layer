/**
 * Asset Service
 *
 * Business logic layer for Asset/Building operations.
 */

import { assetRepository, type AssetWithKpiCount } from "@/lib/repositories/asset.repository";
import { auditService } from "./audit.service";
import { ApiError } from "@/lib/core/ErrorHandler";
import type { ServiceContext } from "@/lib/domain/shared";
import { createPaginatedResult, type PaginatedResult } from "@/lib/domain/shared";
import type {
  CreateAssetDto,
  UpdateAssetDto,
  ListAssetsQueryDto,
  AssetDto,
  AssetDetailsDto,
} from "@/lib/domain/asset";

// =============================================================================
// Service Class
// =============================================================================

export class AssetService {
  constructor(private repository = assetRepository) {}

  // ===========================================================================
  // List Operations
  // ===========================================================================

  /**
   * List assets for organization with pagination
   */
  async list(
    organizationId: string,
    query: ListAssetsQueryDto
  ): Promise<PaginatedResult<AssetDto>> {
    const { page, limit, search, sortBy, sortOrder } = query;

    const filters = {
      organizationId,
      search,
    };

    const [assets, total] = await Promise.all([
      this.repository.findMany({
        filters,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy || "createdAt"]: sortOrder || "desc" },
      }),
      this.repository.count(filters),
    ]);

    const data = assets.map(this.toAssetDto);
    return createPaginatedResult(data, page, limit, total);
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Get asset details by ID
   */
  async getById(id: string, organizationId: string): Promise<AssetDetailsDto> {
    const asset = await this.repository.findByIdWithDetails(id, organizationId);

    if (!asset) {
      throw ApiError.assetNotFound(id);
    }

    return this.toAssetDetailsDto(asset);
  }

  /**
   * Create a new asset
   */
  async create(
    dto: CreateAssetDto,
    ctx: ServiceContext
  ): Promise<AssetDto> {
    // Require organization context for tenant-scoped operations
    if (!ctx.organizationId) {
      throw ApiError.forbidden("Organization context required for this operation");
    }

    // Check for duplicate externalId
    if (dto.externalId) {
      const exists = await this.repository.externalIdExists(
        dto.externalId,
        ctx.organizationId
      );
      if (exists) {
        throw ApiError.duplicateExternalId(dto.externalId);
      }
    }

    const asset = await this.repository.create({
      organizationId: ctx.organizationId,
      name: dto.name,
      address: dto.address,
      description: dto.description,
      externalId: dto.externalId,
      dataSource: ctx.isOrgLevel ? "API" : "MANUAL",
      sourceTag: ctx.isOrgLevel ? "PARTNER" : "MANUAL",
    });

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ASSET_CREATED",
      resource: "building",
      resourceId: asset.id,
      payload: dto,
      statusCode: 201,
    });

    return this.toAssetDto(asset as AssetWithKpiCount);
  }

  /**
   * Update an asset
   */
  async update(
    id: string,
    dto: UpdateAssetDto,
    ctx: ServiceContext
  ): Promise<AssetDto> {
    // Require organization context for tenant-scoped operations
    if (!ctx.organizationId) {
      throw ApiError.forbidden("Organization context required for this operation");
    }

    // Check asset exists
    const existing = await this.repository.findById(id, ctx.organizationId);

    if (!existing) {
      throw ApiError.assetNotFound(id);
    }

    // Check for duplicate externalId if changing
    if (dto.externalId && dto.externalId !== existing.externalId) {
      const exists = await this.repository.externalIdExists(
        dto.externalId,
        ctx.organizationId,
        id
      );
      if (exists) {
        throw ApiError.duplicateExternalId(dto.externalId);
      }
    }

    const asset = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.externalId !== undefined && { externalId: dto.externalId }),
    });

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ASSET_UPDATED",
      resource: "building",
      resourceId: id,
      payload: { changes: dto },
      statusCode: 200,
    });

    return this.toAssetDto(asset as AssetWithKpiCount);
  }

  /**
   * Delete an asset
   */
  async delete(id: string, ctx: ServiceContext): Promise<void> {
    // Require organization context for tenant-scoped operations
    if (!ctx.organizationId) {
      throw ApiError.forbidden("Organization context required for this operation");
    }

    // Check asset exists
    const existing = await this.repository.findById(id, ctx.organizationId);

    if (!existing) {
      throw ApiError.assetNotFound(id);
    }

    await this.repository.delete(id);

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ASSET_DELETED",
      resource: "building",
      resourceId: id,
      statusCode: 200,
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Find or create asset by external ID
   */
  async findOrCreateByExternalId(
    externalId: string,
    organizationId: string
  ): Promise<{ asset: { id: string; externalId: string | null }; created: boolean }> {
    let asset = await this.repository.findByExternalId(externalId, organizationId);

    if (!asset) {
      asset = await this.repository.create({
        organizationId,
        externalId,
        dataSource: "API",
        sourceTag: "PARTNER",
      });
      return { asset: { id: asset.id, externalId: asset.externalId }, created: true };
    }

    return { asset: { id: asset.id, externalId: asset.externalId }, created: false };
  }

  /**
   * Get latest KPI version for asset
   */
  async getLatestKpiVersion(assetId: string): Promise<number> {
    return this.repository.getLatestKpiVersion(assetId);
  }

  // ===========================================================================
  // Transformers
  // ===========================================================================

  private toAssetDto(asset: AssetWithKpiCount | { id: string; name: string | null; address: string | null; description: string | null; externalId: string | null; dataSource: string; createdAt: Date; updatedAt: Date; _count?: { kpiRecords: number } }): AssetDto {
    return {
      id: asset.id,
      name: asset.name,
      address: asset.address,
      description: asset.description,
      externalId: asset.externalId,
      dataSource: asset.dataSource as AssetDto["dataSource"],
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      kpiRecordCount: asset._count?.kpiRecords,
    };
  }

  private toAssetDetailsDto(asset: {
    id: string;
    name: string | null;
    address: string | null;
    description: string | null;
    externalId: string | null;
    dataSource: string;
    sourceTag: string | null;
    createdAt: Date;
    updatedAt: Date;
    kpiRecords: Array<{
      id: string;
      dataVersion: number;
      validationStatus: string;
      kpiData: unknown;
      createdAt: Date;
    }>;
    signedDocuments?: Array<{ id: string; signedAt: Date }>;
    _count: { kpiRecords: number };
  }): AssetDetailsDto {
    return {
      id: asset.id,
      name: asset.name,
      address: asset.address,
      description: asset.description,
      externalId: asset.externalId,
      dataSource: asset.dataSource as AssetDetailsDto["dataSource"],
      sourceTag: asset.sourceTag,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      kpiRecordCount: asset._count.kpiRecords,
      latestKpi: asset.kpiRecords[0] || null,
      signedDocuments: asset.signedDocuments,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const assetService = new AssetService();
