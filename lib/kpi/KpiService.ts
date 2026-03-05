/**
 * KPI Service
 *
 * Handles KPI record creation with:
 * - Automatic data versioning per asset
 * - Schema version FK reference
 * - Validation status tracking
 * - Audit logging
 */

import prisma from "../prisma";
import { ApiError } from "../core/ErrorHandler";
import { Logger } from "../core/Logger";
import { schemaService } from "./SchemaService";
import { isJsonObject, toJsonValue } from "../utils/json";
import { computeChecksum } from "../utils/checksum";
import { FlatKpiSchema } from "./schema";
import { validateDependencies } from "./validators";
import type { KpiRecord, ValidationStatus, DataSource } from "@prisma/client";
import type { ServiceContext } from "../domain/shared";

// =============================================================================
// Types
// =============================================================================

export interface SubmitKpiParams {
  assetId: string;
  organizationId: string;
  kpis: object;
  schemaVersion?: string;
  submissionId?: string;
  externalAssetId?: string;
  source?: DataSource;
}

export interface KpiRecordResult {
  id: string;
  assetId: string;
  dataVersion: number;
  schemaVersion: string;
  validationStatus: ValidationStatus;
  validationErrors?: object;
  createdAt: Date;
}

export interface GetKpiParams {
  assetId: string;
  organizationId: string;
  version?: number;
}

export interface ListKpiParams {
  assetId: string;
  organizationId: string;
  limit?: number;
  offset?: number;
}

export interface KpiVersionWithSchema {
  id: string;
  assetId: string;
  dataVersion: number;
  schemaVersion: string;
  kpiData: unknown;
  validationStatus: ValidationStatus;
  validationErrors: unknown;
  source: DataSource;
  createdAt: Date;
}

export interface SubmitKpiWithValidationParams {
  assetId: string;
  organizationId: string;
  kpis: Record<string, unknown>;
  schemaVersion?: string;
  idempotencyKey?: string;
  ctx: ServiceContext;
}

export interface KpiSubmissionResult {
  data: {
    id: string;
    assetId: string;
    externalId?: string | null;
    dataVersion: number;
    schemaVersion: string;
    validationStatus: ValidationStatus;
    validationErrors?: object[];
    createdAt: Date;
  };
  transactionId: string;
  idempotent?: boolean;
  status: number;
}

export interface SubmitKpiByIdentifierParams {
  assetId?: string;
  externalId?: string;
  organizationId: string;
  kpis: Record<string, unknown>;
  schemaVersion?: string;
  idempotencyKey?: string;
  assetName?: string;
  assetAddress?: string;
  ctx: ServiceContext;
}

export interface KpiHistoryItem {
  id: string;
  dataVersion: number;
  schemaVersion: string;
  validationStatus: ValidationStatus;
  source: DataSource;
  createdAt: Date;
}

export interface KpiHistoryResult {
  data: KpiHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =============================================================================
// KPI Service
// =============================================================================

export class KpiService {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ connector: "KpiService" });
  }

  /**
   * Create a new logger instance for a specific context
   */
  withLogger(logger: Logger): KpiService {
    return new KpiService(logger);
  }

  /**
   * Submit KPI data for an asset
   */
  async submitKpi(params: SubmitKpiParams): Promise<KpiRecordResult> {
    const {
      assetId,
      organizationId,
      kpis,
      schemaVersion,
      submissionId,
      externalAssetId,
      source = "API",
    } = params;

    this.logger.info("Submitting KPI data", { assetId, schemaVersion, source });

    // 1. Get schema (default if not specified)
    const schema = await schemaService.getSchema(schemaVersion);

    // 2. Verify asset exists and belongs to organization
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        organizationId,
      },
    });

    if (!asset) {
      throw ApiError.assetNotFound(assetId);
    }

    // 3. Get next data version for this asset
    const latestRecord = await prisma.kpiRecord.findFirst({
      where: { assetId },
      orderBy: { dataVersion: "desc" },
      select: { dataVersion: true },
    });

    const nextDataVersion = (latestRecord?.dataVersion ?? 0) + 1;

    // 4. Compute checksum for data integrity
    const checksum = computeChecksum(kpis);

    // 5. Create KPI record
    const kpiRecord = await prisma.kpiRecord.create({
      data: {
        assetId,
        organizationId,
        submissionId,
        dataVersion: nextDataVersion,
        schemaVersionId: schema.id,
        kpiData: kpis,
        checksum,
        validationStatus: "PENDING",
        externalAssetId,
        source,
      },
    });

    this.logger.info("KPI record created", {
      id: kpiRecord.id,
      assetId,
      dataVersion: nextDataVersion,
      schemaVersion: schema.version,
    });

    return {
      id: kpiRecord.id,
      assetId: kpiRecord.assetId,
      dataVersion: kpiRecord.dataVersion,
      schemaVersion: schema.version,
      validationStatus: kpiRecord.validationStatus,
      createdAt: kpiRecord.createdAt,
    };
  }

  /**
   * Get latest KPI record for an asset
   */
  async getLatestKpi(params: GetKpiParams): Promise<KpiRecord | null> {
    const { assetId, organizationId } = params;

    const record = await prisma.kpiRecord.findFirst({
      where: {
        assetId,
        organizationId,
      },
      orderBy: { dataVersion: "desc" },
    });

    return record;
  }

  /**
   * Get specific version of KPI record for an asset
   */
  async getKpiByVersion(
    params: GetKpiParams & { version: number }
  ): Promise<KpiRecord | null> {
    const { assetId, organizationId, version } = params;

    const record = await prisma.kpiRecord.findFirst({
      where: {
        assetId,
        organizationId,
        dataVersion: version,
      },
    });

    return record;
  }

  /**
   * Get KPI version with schema info - throws if not found
   */
  async getKpiVersionWithSchema(
    assetId: string,
    version: number,
    organizationId: string
  ): Promise<KpiVersionWithSchema> {
    // Verify asset exists and belongs to org
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      throw ApiError.assetNotFound(assetId);
    }

    const record = await prisma.kpiRecord.findFirst({
      where: {
        assetId,
        dataVersion: version,
      },
      include: {
        schemaRegistry: {
          select: { version: true, name: true },
        },
      },
    });

    if (!record) {
      throw ApiError.notFound("KPI version", String(version));
    }

    return {
      id: record.id,
      assetId: record.assetId,
      dataVersion: record.dataVersion,
      schemaVersion: record.schemaRegistry.version,
      kpiData: record.kpiData,
      validationStatus: record.validationStatus,
      validationErrors: record.validationErrors,
      source: record.source,
      createdAt: record.createdAt,
    };
  }

  /**
   * List KPI records for an asset (history)
   */
  async listKpiHistory(params: ListKpiParams): Promise<{
    records: KpiRecord[];
    total: number;
  }> {
    const { assetId, organizationId, limit = 10, offset = 0 } = params;

    const [records, total] = await Promise.all([
      prisma.kpiRecord.findMany({
        where: {
          assetId,
          organizationId,
        },
        orderBy: { dataVersion: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.kpiRecord.count({
        where: {
          assetId,
          organizationId,
        },
      }),
    ]);

    return { records, total };
  }

  /**
   * List KPI history with schema info - formatted for API response
   */
  async listKpiHistoryWithSchema(
    params: ListKpiParams
  ): Promise<KpiHistoryResult> {
    const { assetId, organizationId, limit = 10, offset = 0 } = params;

    // Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      throw ApiError.assetNotFound(assetId);
    }

    const [records, total] = await Promise.all([
      prisma.kpiRecord.findMany({
        where: { assetId, organizationId },
        orderBy: { dataVersion: "desc" },
        take: limit,
        skip: offset,
        include: {
          schemaRegistry: {
            select: { version: true },
          },
        },
      }),
      prisma.kpiRecord.count({
        where: { assetId, organizationId },
      }),
    ]);

    return {
      data: records.map((record) => ({
        id: record.id,
        dataVersion: record.dataVersion,
        schemaVersion: record.schemaRegistry.version,
        validationStatus: record.validationStatus,
        source: record.source,
        createdAt: record.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + records.length < total,
      },
    };
  }

  /**
   * Submit KPI with full validation workflow
   */
  async submitKpiWithValidation(
    params: SubmitKpiWithValidationParams
  ): Promise<KpiSubmissionResult> {
    const {
      assetId,
      organizationId,
      kpis,
      schemaVersion,
      idempotencyKey,
      ctx,
    } = params;

    const startTime = Date.now();

    // Set logger context for audit logging
    this.logger.setContext({
      organizationId,
      userId: ctx.userId,
      assetId,
    });

    // 1. Get schema (default if not specified)
    const schema = await schemaService.getSchema(schemaVersion);

    // 2. Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      throw ApiError.assetNotFound(assetId);
    }

    // 3. Check idempotency
    if (idempotencyKey) {
      const existing = await prisma.submission.findUnique({
        where: { idempotencyKey },
        include: {
          kpiRecord: {
            include: {
              schemaRegistry: { select: { version: true } },
            },
          },
        },
      });

      if (existing && existing.kpiRecord) {
        this.logger.info("Idempotent request - returning existing result");

        return {
          data: {
            id: existing.kpiRecord.id,
            assetId: existing.kpiRecord.assetId,
            dataVersion: existing.kpiRecord.dataVersion,
            schemaVersion: existing.kpiRecord.schemaRegistry.version,
            validationStatus: existing.kpiRecord.validationStatus,
            validationErrors: existing.kpiRecord.validationErrors as
              | object[]
              | undefined,
            createdAt: existing.kpiRecord.createdAt,
          },
          transactionId: existing.id,
          idempotent: true,
          status: 200,
        };
      }
    }

    // 4. Validate KPI data with Zod schema
    const parseResult = FlatKpiSchema.safeParse(kpis);

    let validationStatus: ValidationStatus = "PASSED";
    let validationErrors: object[] = [];

    if (!parseResult.success) {
      validationStatus = "FAILED";
      validationErrors = parseResult.error.issues.map((e) => ({
        field: e.path.join("."),
        code: e.code,
        message: e.message,
      }));
    }

    // 5. Validate subset dependencies (if parse succeeded)
    if (parseResult.success) {
      const depResult = validateDependencies(parseResult.data);
      if (!depResult.valid) {
        validationStatus = "FAILED";
        validationErrors = depResult.errors.map((e) => ({
          field: e.field,
          code: "DEPENDENCY_ERROR",
          message: e.message,
        }));
      }
    }

    // 6. Create submission record (always, for audit trail)
    const submission = await prisma.submission.create({
      data: {
        organizationId,
        userId: ctx.isOrgLevel ? null : ctx.userId,
        submissionType: "SINGLE",
        resourceType: "KpiRecord",
        resourceId: assetId,
        sourceTag: "PARTNER",
        status: validationStatus === "PASSED" ? "SUCCESS" : "FAILED",
        validationStatus,
        validationErrors:
          validationErrors.length > 0
            ? toJsonValue(validationErrors)
            : undefined,
        idempotencyKey,
        requestPayload: toJsonValue(kpis),
        kpiVersion: schema.version,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    // 7. If validation failed, return early without creating KPI record
    if (validationStatus === "FAILED") {
      const responseTime = Date.now() - startTime;
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          responseTime,
          completedAt: new Date(),
        },
      });

      // Audit log for failed submission
      await this.logger.audit({
        action: "SUBMISSION_FAILED",
        resource: "Submission",
        resourceId: submission.id,
        payload: kpis,
        response: { validationStatus, validationErrors },
        schemaVersion: schema.version,
        statusCode: 400,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      });

      return {
        data: {
          id: submission.id,
          assetId,
          externalId: asset.externalId,
          dataVersion: 0, // No version created
          schemaVersion: schema.version,
          validationStatus,
          validationErrors,
          createdAt: submission.submittedAt,
        },
        transactionId: submission.id,
        status: 400,
      };
    }

    // 8. Create KPI record (only on successful validation)
    const result = await this.submitKpi({
      assetId,
      organizationId,
      kpis,
      schemaVersion: schema.version,
      submissionId: submission.id,
      externalAssetId: asset.externalId || undefined,
      source: "API",
    });

    // 9. Update validation status to PASSED
    await this.updateValidationStatus(result.id, "PASSED");

    // 10. Complete submission with response time
    const responseTime = Date.now() - startTime;
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        responseTime,
        completedAt: new Date(),
      },
    });

    // 11. Audit log for successful submission
    await this.logger.audit({
      action: "KPI_SUBMITTED",
      resource: "KpiRecord",
      resourceId: result.id,
      payload: kpis,
      response: { dataVersion: result.dataVersion, validationStatus: "PASSED" },
      schemaVersion: schema.version,
      statusCode: 201,
      ipAddress: ctx.ipAddress || undefined,
      userAgent: ctx.userAgent || undefined,
    });

    return {
      data: {
        id: result.id,
        assetId: result.assetId,
        externalId: asset.externalId,
        dataVersion: result.dataVersion,
        schemaVersion: schema.version,
        validationStatus: "PASSED",
        createdAt: result.createdAt,
      },
      transactionId: submission.id,
      status: 201,
    };
  }

  /**
   * Submit KPI by asset_id or external_id (for partner API)
   * Finds asset by identifier, returns error if not found
   */
  async submitKpiByIdentifier(
    params: SubmitKpiByIdentifierParams
  ): Promise<KpiSubmissionResult> {
    const {
      assetId,
      externalId,
      organizationId,
      kpis,
      schemaVersion,
      idempotencyKey,
      ctx,
    } = params;

    // Set logger context for audit logging
    this.logger.setContext({
      organizationId,
      userId: ctx.userId,
      endpoint: "/api/assets/kpis",
      method: "POST",
    });

    // Validate that at least one identifier is provided
    if (!assetId && !externalId) {
      this.logger.warn("KPI submission missing identifier", {
        organizationId,
      });
      throw ApiError.validation("Either asset_id or external_id is required");
    }

    // Find or create asset by identifier
    let asset;
    if (assetId) {
      asset = await prisma.asset.findFirst({
        where: { id: assetId, organizationId },
      });
      if (!asset) {
        this.logger.warn("KPI submission for unknown asset_id", {
          assetId,
          organizationId,
        });
        throw ApiError.assetNotFound(assetId);
      }
    } else if (externalId) {
      // Find existing asset or create new one
      asset = await prisma.asset.findFirst({
        where: { externalId, organizationId },
      });
      
      if (!asset) {
        this.logger.info("Creating new asset for external_id", {
          externalId,
          organizationId,
        });
        
        asset = await prisma.asset.create({
          data: {
            organizationId,
            externalId,
            name: params.assetName || externalId,
            address: params.assetAddress,
            dataSource: "API",
            sourceTag: "PARTNER",
          },
        });
        
        this.logger.info("Asset created successfully", {
          assetId: asset.id,
          externalId,
        });
      }
    }

    this.logger.info("Asset found for KPI submission", {
      assetId: asset!.id,
      externalId: asset!.externalId,
    });

    // Delegate to existing method
    return this.submitKpiWithValidation({
      assetId: asset!.id,
      organizationId,
      kpis,
      schemaVersion,
      idempotencyKey,
      ctx,
    });
  }

  /**
   * Get full KPI record with schema info
   */
  async getKpiWithSchema(kpiRecordId: string, organizationId: string) {
    const record = await prisma.kpiRecord.findFirst({
      where: {
        id: kpiRecordId,
        organizationId,
      },
      include: {
        schemaRegistry: {
          select: {
            version: true,
            name: true,
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
      },
    });

    return record;
  }

  /**
   * Update validation status
   */
  async updateValidationStatus(
    kpiRecordId: string,
    status: ValidationStatus,
    errors?: object
  ): Promise<KpiRecord> {
    const record = await prisma.kpiRecord.update({
      where: { id: kpiRecordId },
      data: {
        validationStatus: status,
        validationErrors: errors,
      },
    });

    this.logger.info("Validation status updated", {
      id: kpiRecordId,
      status,
      hasErrors: !!errors,
    });

    return record;
  }

  /**
   * Get count of KPI records for an asset
   */
  async getVersionCount(assetId: string): Promise<number> {
    return prisma.kpiRecord.count({
      where: { assetId },
    });
  }

  /**
   * Compare two KPI records and return changed fields
   */
  async compareVersions(
    assetId: string,
    version1: number,
    version2: number
  ): Promise<{
    changedFields: string[];
    record1: KpiRecord | null;
    record2: KpiRecord | null;
  }> {
    const [record1, record2] = await Promise.all([
      prisma.kpiRecord.findFirst({
        where: { assetId, dataVersion: version1 },
      }),
      prisma.kpiRecord.findFirst({
        where: { assetId, dataVersion: version2 },
      }),
    ]);

    const changedFields: string[] = [];

    if (record1 && record2) {
      // Safely extract KPI data using type guard
      const data1 = isJsonObject(record1.kpiData) ? record1.kpiData : {};
      const data2 = isJsonObject(record2.kpiData) ? record2.kpiData : {};

      // Find all unique keys
      const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);

      for (const key of allKeys) {
        if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
          changedFields.push(key);
        }
      }
    }

    return { changedFields, record1, record2 };
  }
}

// =============================================================================
// Default Instance
// =============================================================================

export const kpiService = new KpiService();
