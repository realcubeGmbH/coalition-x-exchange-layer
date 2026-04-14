/**
 * Partner Sync DTOs
 *
 * Input/output types for the accredited partner sync endpoint.
 */

// =============================================================================
// Input DTO
// =============================================================================

export interface PartnerSyncDto {
  user_id: string;
  email: string;
  org_id: string;
  tech_provider_id: string;
  user_role: string;
  accreditation_flag: "Yes" | "No";
  did: string;
  initial_secret: string;
  time_stamp: string;
}

// =============================================================================
// Output DTO
// =============================================================================

export interface PartnerSyncResultDto {
  syncId: string;
  organization: {
    id: string;
    name: string;
    clientId: string;
  };
  credentials: {
    clientId: string;
    clientSecret: string;
  };
  userId: string;
  message: string;
}
