/**
 * Asset Repository
 *
 * Data access layer for Asset/Building operations.
 * All queries enforce organizationId for multi-tenant isolation.
 */

import prisma from "@/lib/prisma";
import type { Asset, Prisma, DataSource, SourceTag } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type AssetWithKpiCount = Asset & {
  _count: {
    kpiRecords: number;
  };
};

export type AssetWithLatestKpi = Asset & {
  kpiRecords: Array<{
    id: string;
    dataVersion: number;
    validationStatus: string;
    kpiData: unknown;
    createdAt: Date;
  }>;
  signedDocuments?: Array<{
    id: string;
    signedAt: Date;
  }>;
  _count: {
    kpiRecords: number;
  };
};

export interface AssetFilters {
  organizationId: string;
  search?: string;
}

// =============================================================================
// Repository Class
// =============================================================================

export class AssetRepository {
  /**
   * Find asset by ID (org-scoped)
   */
  async findById(id: string, organizationId: string): Promise<Asset | null> {
    return prisma.asset.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Find asset by ID with latest KPI records
   */
  async findByIdWithDetails(
    id: string,
    organizationId: string
  ): Promise<AssetWithLatestKpi | null> {
    return prisma.asset.findFirst({
      where: { id, organizationId },
      include: {
        kpiRecords: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            dataVersion: true,
            validationStatus: true,
            kpiData: true,
            createdAt: true,
          },
        },
        signedDocuments: {
          orderBy: { signedAt: "desc" },
          take: 5,
          select: {
            id: true,
            signedAt: true,
          },
        },
        _count: {
          select: { kpiRecords: true },
        },
      },
    });
  }

  /**
   * Find asset by external ID (org-scoped)
   */
  async findByExternalId(
    externalId: string,
    organizationId: string
  ): Promise<Asset | null> {
    return prisma.asset.findFirst({
      where: { externalId, organizationId },
    });
  }

  /**
   * Find asset by external ID with latest KPI version
   */
  async findByExternalIdWithKpi(
    externalId: string,
    organizationId: string
  ): Promise<
    | (Asset & {
        kpiRecords: Array<{ dataVersion: number }>;
      })
    | null
  > {
    return prisma.asset.findFirst({
      where: { externalId, organizationId },
      include: {
        kpiRecords: {
          orderBy: { dataVersion: "desc" },
          take: 1,
          select: { dataVersion: true },
        },
      },
    });
  }

  /**
   * Find many assets with filters and pagination (org-scoped)
   */
  async findMany(params: {
    filters: AssetFilters;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AssetOrderByWithRelationInput;
  }): Promise<AssetWithKpiCount[]> {
    const where = this.buildWhereClause(params.filters);

    return prisma.asset.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      include: {
        _count: {
          select: { kpiRecords: true },
        },
      },
    });
  }

  /**
   * Count assets with filters (org-scoped)
   */
  async count(filters: AssetFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.asset.count({ where });
  }

  /**
   * Create a new asset
   */
  async create(data: {
    organizationId: string;
    name?: string;
    address?: string;
    description?: string;
    externalId?: string;
    dataSource: DataSource;
    sourceTag?: SourceTag;
  }): Promise<Asset> {
    return prisma.asset.create({ data });
  }

  /**
   * Update an asset
   */
  async update(id: string, data: Prisma.AssetUpdateInput): Promise<Asset> {
    return prisma.asset.update({ where: { id }, data });
  }

  /**
   * Delete an asset (cascades to related records)
   */
  async delete(id: string): Promise<Asset> {
    return prisma.asset.delete({ where: { id } });
  }

  /**
   * Check if external ID already exists in org
   */
  async externalIdExists(
    externalId: string,
    organizationId: string,
    excludeId?: string
  ): Promise<boolean> {
    const asset = await prisma.asset.findFirst({
      where: {
        externalId,
        organizationId,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    return !!asset;
  }

  /**
   * Get latest KPI version for asset
   */
  async getLatestKpiVersion(assetId: string): Promise<number> {
    const record = await prisma.kpiRecord.findFirst({
      where: { assetId },
      orderBy: { dataVersion: "desc" },
      select: { dataVersion: true },
    });
    return record?.dataVersion ?? 0;
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: AssetFilters): Prisma.AssetWhereInput {
    const where: Prisma.AssetWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
        { externalId: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const assetRepository = new AssetRepository();
