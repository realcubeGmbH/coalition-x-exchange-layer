/**
 * KPI DTOs
 *
 * Data Transfer Objects for KPI operations.
 */

import type { ValidationStatus, DataSource } from "@prisma/client";

// =============================================================================
// Input DTOs (Requests)
// =============================================================================

/**
 * DTO for submitting KPI data
 */
export interface SubmitKpiDto {
  kpis: Record<string, unknown>;
  schemaVersion?: string;
}

/**
 * DTO for listing KPI history
 */
export interface ListKpiHistoryQueryDto {
  limit?: number;
  offset?: number;
  version?: number;
}

// =============================================================================
// Output DTOs (Responses)
// =============================================================================

/**
 * KPI record summary (for lists)
 */
export interface KpiRecordDto {
  id: string;
  assetId: string;
  dataVersion: number;
  schemaVersion: string;
  validationStatus: ValidationStatus;
  validationErrors?: unknown;
  source: DataSource;
  createdAt: Date;
}

/**
 * KPI record with data
 */
export interface KpiRecordWithDataDto extends KpiRecordDto {
  kpiData: unknown;
}

/**
 * KPI submission result
 */
export interface KpiSubmissionResultDto {
  success: boolean;
  transactionId: string;
  kpiRecordId: string;
  buildingId: string;
  dataVersion: number;
  schemaVersion: string;
  timestamp: string;
  context?: Record<string, unknown>;
  warnings?: Array<{ field: string; code: string; message: string }>;
}

/**
 * KPI validation error
 */
export interface KpiValidationErrorDto {
  field: string;
  code: string;
  message: string;
}

/**
 * KPI submission failure result
 */
export interface KpiSubmissionFailureDto {
  error: string;
  message: string;
  code: string;
  transactionId: string;
  timestamp: string;
  schemaVersion: string;
  errors: KpiValidationErrorDto[];
  warnings?: KpiValidationErrorDto[];
}
