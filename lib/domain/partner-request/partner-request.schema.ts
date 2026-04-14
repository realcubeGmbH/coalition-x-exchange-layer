/**
 * Partner Sync Schemas
 *
 * Zod validation for inbound accredited partner data from POM+.
 */

import { z } from "zod";

// =============================================================================
// Partner Sync Request (Inbound from POM+)
// =============================================================================

export const PartnerSyncSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  email: z.string().email("Valid email is required"),
  org_id: z.string().min(1, "org_id is required"),
  tech_provider_id: z.string().min(1, "tech_provider_id is required"),
  user_role: z.string().min(1, "user_role is required"),
  accreditation_flag: z.enum(["Yes", "No"]),
  did: z.string().min(1, "did is required"),
  initial_secret: z.string().min(8, "initial_secret must be at least 8 characters"),
  time_stamp: z.string().datetime("time_stamp must be a valid ISO 8601 datetime"),
});

export type PartnerSyncInput = z.infer<typeof PartnerSyncSchema>;
