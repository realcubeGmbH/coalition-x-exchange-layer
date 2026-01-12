/**
 * KPI Repository
 *
 * Data access layer for KPI Record operations.
 */

import prisma from "@/lib/prisma";
import type {
  KpiRecord,
  Prisma,
  ValidationStatus,
  DataSource,
} from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type KpiRecordWithSchema = KpiRecord & {
  schemaRegistry: {
    version: string;
    name: string | null;
  };
};

export type KpiRecordWithAsset = KpiRecord & {
  asset: {
    id: string;
    name: string | null;
    externalId: string | null;
  };
};

// =============================================================================
// Repository Class
// =============================================================================

export class KpiRepository {
  /**
   * Find KPI record by ID
   */
  async findById(id: string): Promise<KpiRecord | null> {
    return prisma.kpiRecord.findUnique({ where: { id } });
  }

  /**
   * Find KPI record by ID with schema info
   */
  async findByIdWithSchema(id: string): Promise<KpiRecordWithSchema | null> {
    return prisma.kpiRecord.findUnique({
      where: { id },
      include: {
        schemaRegistry: {
          select: { version: true, name: true },
        },
      },
    });
  }

  /**
   * Find KPI record by ID (org-scoped)
   */
  async findByIdForOrg(
    id: string,
    organizationId: string
  ): Promise<KpiRecord | null> {
    return prisma.kpiRecord.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Find latest KPI record for asset
   */
  async findLatestByAsset(
    assetId: string,
    organizationId: string
  ): Promise<KpiRecord | null> {
    return prisma.kpiRecord.findFirst({
      where: { assetId, organizationId },
      orderBy: { dataVersion: "desc" },
    });
  }

  /**
   * Find KPI record by asset and version
   */
  async findByAssetAndVersion(
    assetId: string,
    dataVersion: number
  ): Promise<KpiRecordWithSchema | null> {
    return prisma.kpiRecord.findFirst({
      where: { assetId, dataVersion },
      include: {
        schemaRegistry: {
          select: { version: true, name: true },
        },
      },
    });
  }

  /**
   * Find KPI history for asset
   */
  async findHistoryByAsset(params: {
    assetId: string;
    organizationId: string;
    limit?: number;
    offset?: number;
  }): Promise<KpiRecordWithSchema[]> {
    return prisma.kpiRecord.findMany({
      where: {
        assetId: params.assetId,
        organizationId: params.organizationId,
      },
      orderBy: { dataVersion: "desc" },
      take: params.limit ?? 10,
      skip: params.offset ?? 0,
      include: {
        schemaRegistry: {
          select: { version: true, name: true },
        },
      },
    });
  }

  /**
   * Count KPI records for asset
   */
  async countByAsset(assetId: string, organizationId: string): Promise<number> {
    return prisma.kpiRecord.count({
      where: { assetId, organizationId },
    });
  }

  /**
   * Get latest version number for asset
   */
  async getLatestVersion(assetId: string): Promise<number> {
    const record = await prisma.kpiRecord.findFirst({
      where: { assetId },
      orderBy: { dataVersion: "desc" },
      select: { dataVersion: true },
    });
    return record?.dataVersion ?? 0;
  }

  /**
   * Create a new KPI record
   */
  async create(data: {
    assetId: string;
    organizationId: string;
    submissionId?: string;
    dataVersion: number;
    schemaVersionId: string;
    kpiData: Prisma.InputJsonValue;
    validationStatus: ValidationStatus;
    validationErrors?: Prisma.InputJsonValue;
    source: DataSource;
    externalAssetId?: string;
  }): Promise<KpiRecord> {
    return prisma.kpiRecord.create({ data });
  }

  /**
   * Update validation status
   */
  async updateValidationStatus(
    id: string,
    status: ValidationStatus,
    errors?: Prisma.InputJsonValue
  ): Promise<KpiRecord> {
    return prisma.kpiRecord.update({
      where: { id },
      data: {
        validationStatus: status,
        validationErrors: errors,
      },
    });
  }

  /**
   * Get schema registry by version
   */
  async getSchemaByVersion(version: string) {
    return prisma.schemaRegistry.findFirst({
      where: { version, isActive: true },
    });
  }

  /**
   * Get default (latest) schema
   */
  async getDefaultSchema() {
    return prisma.schemaRegistry.findFirst({
      where: { isActive: true },
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const kpiRepository = new KpiRepository();
