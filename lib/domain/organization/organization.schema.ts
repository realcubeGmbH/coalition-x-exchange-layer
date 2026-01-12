/**
 * Organization Schemas
 *
 * Zod validation schemas for Organization operations.
 */

import { z } from "zod";

// =============================================================================
// Create Organization
// =============================================================================

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  type: z.enum(["ACCREDITED_PARTNER", "CLIENT"]),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
  description: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

// =============================================================================
// Update Organization
// =============================================================================

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"]).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

// =============================================================================
// List Organizations Query
// =============================================================================

export const ListOrganizationsQuerySchema = z.object({
  type: z.enum(["ACCREDITED_PARTNER", "CLIENT", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListOrganizationsQueryInput = z.infer<typeof ListOrganizationsQuerySchema>;

// =============================================================================
// Credentials
// =============================================================================

export const GenerateCredentialsSchema = z.object({
  rotate: z.boolean().optional().default(false),
});

export type GenerateCredentialsInput = z.infer<typeof GenerateCredentialsSchema>;
