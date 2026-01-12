/**
 * Organization DTOs
 *
 * Data Transfer Objects for Organization operations.
 * Used across all layers: routes, services, and repositories.
 */

import type { OrgType, OrgStatus } from "@prisma/client";

// =============================================================================
// Input DTOs (Requests)
// =============================================================================

/**
 * DTO for creating a new organization
 */
export interface CreateOrganizationDto {
  name: string;
  type: Extract<OrgType, "ACCREDITED_PARTNER" | "CLIENT">;
  contactEmail?: string;
  contactName?: string;
  description?: string;
}

/**
 * DTO for updating an organization
 */
export interface UpdateOrganizationDto {
  name?: string;
  status?: OrgStatus;
}

/**
 * DTO for listing organizations with filters
 */
export interface ListOrganizationsQueryDto {
  type?: OrgType;
  status?: OrgStatus;
  page: number;
  limit: number;
}

/**
 * DTO for generating/rotating credentials
 */
export interface GenerateCredentialsDto {
  rotate?: boolean;
}

// =============================================================================
// Output DTOs (Responses)
// =============================================================================

/**
 * Basic organization summary (for lists)
 */
export interface OrganizationDto {
  id: string;
  clientId: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  assetCount?: number;
}

/**
 * Detailed organization info (for single resource)
 */
export interface OrganizationDetailsDto extends OrganizationDto {
  hasApiKey: boolean;
  counts: {
    users: number;
    assets: number;
    apiTokens: number;
  };
  recentUsers?: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  }>;
}

/**
 * OAuth credentials response (only returned once on generation)
 */
export interface OrganizationCredentialsDto {
  clientId: string;
  clientSecret: string;
}

/**
 * Credentials status response
 */
export interface CredentialsStatusDto {
  hasCredentials: boolean;
  clientId: string;
  clientSecretConfigured: boolean;
}
