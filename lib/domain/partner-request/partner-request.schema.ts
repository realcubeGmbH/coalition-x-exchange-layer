/**
 * Partner Request Schemas
 */

import { z } from "zod";

// =============================================================================
// Create Partner Request (Public Application)
// =============================================================================

export const CreatePartnerRequestSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Valid email is required"),
  website: z.string().url("Must be a valid URL").optional(),
  integrationType: z.enum(["API", "MANUAL", "HYBRID"]),
  estimatedVolume: z.number().int().positive().optional(),
  useCase: z.string().min(10, "Please describe your use case (min 10 characters)"),
});

export type CreatePartnerRequestInput = z.infer<typeof CreatePartnerRequestSchema>;

// =============================================================================
// Review Partner Request (Admin)
// =============================================================================

export const ReviewPartnerRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => !(data.action === "reject" && !data.rejectionReason),
  { message: "Rejection reason is required when rejecting", path: ["rejectionReason"] }
);

export type ReviewPartnerRequestInput = z.infer<typeof ReviewPartnerRequestSchema>;

// =============================================================================
// List Query
// =============================================================================

export const ListPartnerRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "REVOKED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPartnerRequestsQueryInput = z.infer<typeof ListPartnerRequestsQuerySchema>;
