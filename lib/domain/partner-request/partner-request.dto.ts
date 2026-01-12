/**
 * Partner Request DTOs
 */

import type { PartnerRequestStatus } from "@prisma/client";

// =============================================================================
// Input DTOs
// =============================================================================

export interface CreatePartnerRequestDto {
  companyName: string;
  contactName: string;
  contactEmail: string;
  website?: string;
  integrationType: "API" | "MANUAL" | "HYBRID";
  estimatedVolume?: number;
  useCase: string;
}

export interface ReviewPartnerRequestDto {
  action: "approve" | "reject";
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface ListPartnerRequestsQueryDto {
  status?: PartnerRequestStatus;
  page: number;
  limit: number;
}

// =============================================================================
// Output DTOs
// =============================================================================

export interface PartnerRequestDto {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  website: string | null;
  integrationType: string;
  estimatedVolume: number | null;
  useCase: string;
  status: PartnerRequestStatus;
  reviewNotes: string | null;
  rejectionReason: string | null;
  organizationId: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
}

export interface PartnerRequestCreatedDto {
  applicationId: string;
  status: "PENDING";
  message: string;
}

export interface PartnerRequestApprovedDto {
  applicationId: string;
  status: "APPROVED";
  organization: {
    id: string;
    clientId: string;
    name: string;
  };
  credentials: {
    clientId: string;
    clientSecret: string;
  };
  message: string;
}
