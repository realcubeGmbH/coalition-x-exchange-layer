/**
 * Asset Schemas
 *
 * Zod validation schemas for Asset/Building operations.
 */

import { z } from "zod";

// =============================================================================
// Create Asset
// =============================================================================

export const CreateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  externalId: z.string().optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

// =============================================================================
// Update Asset
// =============================================================================

export const UpdateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  externalId: z.string().optional(),
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

// =============================================================================
// List Assets Query
// =============================================================================

export const ListAssetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListAssetsQueryInput = z.infer<typeof ListAssetsQuerySchema>;

// =============================================================================
// Batch Submission
// =============================================================================

export const BatchAssetItemSchema = z.object({
  external_id: z.string().min(1, "external_id is required"),
  kpis: z.record(z.string(), z.string()),
});

export const BatchAssetSubmissionSchema = z.object({
  buildings: z
    .array(BatchAssetItemSchema)
    .min(1, "At least one building is required")
    .max(100, "Maximum 100 buildings per batch"),
});

export type BatchAssetSubmissionInput = z.infer<
  typeof BatchAssetSubmissionSchema
>;
