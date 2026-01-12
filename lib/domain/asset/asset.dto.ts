/**
 * Asset DTOs
 *
 * Data Transfer Objects for Asset/Building operations.
 * Note: "Asset" is the internal model name, "Building" is the user-facing term.
 */

import type { DataSource } from "@prisma/client";

// =============================================================================
// Input DTOs (Requests)
// =============================================================================

/**
 * DTO for creating a new asset/building
 */
export interface CreateAssetDto {
  name?: string;
  address?: string;
  description?: string;
  externalId?: string;
}

/**
 * DTO for updating an asset/building
 */
export interface UpdateAssetDto {
  name?: string;
  address?: string;
  description?: string;
  externalId?: string;
}

/**
 * DTO for listing assets with filters
 */
export interface ListAssetsQueryDto {
  page: number;
  limit: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/**
 * DTO for batch asset submission
 */
export interface BatchAssetItemDto {
  external_id: string;
  kpis: Record<string, unknown>;
}

export interface BatchAssetSubmissionDto {
  buildings: BatchAssetItemDto[];
}

// =============================================================================
// Output DTOs (Responses)
// =============================================================================

/**
 * Basic asset summary (for lists)
 */
export interface AssetDto {
  id: string;
  name: string | null;
  address: string | null;
  description: string | null;
  externalId: string | null;
  dataSource: DataSource;
  createdAt: Date;
  updatedAt: Date;
  kpiRecordCount?: number;
}

/**
 * Asset with latest KPI info
 */
export interface AssetDetailsDto extends AssetDto {
  sourceTag: string | null;
  latestKpi?: {
    id: string;
    dataVersion: number;
    validationStatus: string;
    kpiData: unknown;
    createdAt: Date;
  } | null;
  signedDocuments?: Array<{
    id: string;
    signedAt: Date;
  }>;
}

/**
 * Batch submission result item
 */
export interface BatchItemResultDto {
  index: number;
  externalId: string;
  buildingId?: string;
  kpiRecordId?: string;
  dataVersion?: number;
  status: "success" | "failed" | "skipped";
  errors?: Array<{ field: string; code: string; message: string }>;
  warnings?: Array<{ field: string; code: string; message: string }>;
}

/**
 * Batch submission response
 */
export interface BatchSubmissionResultDto {
  transactionId: string;
  timestamp: string;
  schemaVersion: string;
  status: "success" | "partial_success" | "failed";
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: BatchItemResultDto[];
  responseTimeMs: number;
}
