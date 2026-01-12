/**
 * Partner Request Service
 *
 * Business logic for Partner application and approval workflow.
 */

import { partnerRequestRepository } from "@/lib/repositories/partner-request.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { auditService } from "./audit.service";
import { ApiError } from "@/lib/core/ErrorHandler";
import { createClientCredentials } from "@/lib/auth";
import type { ServiceContext } from "@/lib/domain/shared";
import type {
  CreatePartnerRequestDto,
  ReviewPartnerRequestDto,
  ListPartnerRequestsQueryDto,
  PartnerRequestDto,
  PartnerRequestCreatedDto,
  PartnerRequestApprovedDto,
} from "@/lib/domain/partner-request";
import type { PaginatedResult } from "@/lib/domain/shared";

// =============================================================================
// Service Class
// =============================================================================

export class PartnerRequestService {
  constructor(
    private requestRepo = partnerRequestRepository,
    private orgRepo = organizationRepository
  ) {}

  // ===========================================================================
  // Submit Application (Public)
  // ===========================================================================

  async submitApplication(
    dto: CreatePartnerRequestDto
  ): Promise<PartnerRequestCreatedDto> {
    // Check for existing application
    const existing = await this.requestRepo.findByEmail(dto.contactEmail);

    if (existing) {
      if (existing.status === "PENDING") {
        throw ApiError.conflict(
          "Application already submitted and pending review"
        );
      }
      if (existing.status === "APPROVED") {
        throw ApiError.conflict(
          "This email is already associated with an approved partner"
        );
      }
    }

    // Create application
    const request = await this.requestRepo.create({
      companyName: dto.companyName,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail.toLowerCase(),
      website: dto.website,
      integrationType: dto.integrationType,
      estimatedVolume: dto.estimatedVolume,
      useCase: dto.useCase,
      status: "PENDING",
    });

    return {
      applicationId: request.id,
      status: "PENDING",
      message:
        "Application submitted. You will receive an email once reviewed.",
    };
  }

  // ===========================================================================
  // List Applications (Admin)
  // ===========================================================================

  async list(
    query: ListPartnerRequestsQueryDto
  ): Promise<PaginatedResult<PartnerRequestDto>> {
    const { data, total } = await this.requestRepo.findMany({
      status: query.status,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: data.map((r) => this.toDto(r)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ===========================================================================
  // Get Single Application (Admin)
  // ===========================================================================

  async getById(id: string): Promise<PartnerRequestDto> {
    const request = await this.requestRepo.findByIdWithOrg(id);

    if (!request) {
      throw ApiError.notFound("Partner request", id);
    }

    return this.toDto(request);
  }

  // ===========================================================================
  // Review Application (Admin - Approve/Reject)
  // ===========================================================================

  async review(
    id: string,
    dto: ReviewPartnerRequestDto,
    ctx: ServiceContext
  ): Promise<PartnerRequestDto | PartnerRequestApprovedDto> {
    const request = await this.requestRepo.findById(id);

    if (!request) {
      throw ApiError.notFound("Partner request", id);
    }

    if (request.status !== "PENDING") {
      throw ApiError.conflict(
        `Application already ${request.status.toLowerCase()}`
      );
    }

    if (dto.action === "reject") {
      // Reject application
      const updated = await this.requestRepo.updateStatus(id, {
        status: "REJECTED",
        reviewedBy: ctx.userId,
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
      });

      await auditService.log({
        organizationId: "SYSTEM",
        userId: ctx.userId,
        action: "PARTNER_REQUEST_REJECTED",
        resource: "partner_request",
        resourceId: id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        payload: { rejectionReason: dto.rejectionReason },
      });

      return this.toDto(updated);
    }

    // Approve: Create organization and credentials
    const org = await this.orgRepo.create({
      name: request.companyName,
      type: "ACCREDITED_PARTNER",
      status: "ACTIVE",
    });

    // Generate credentials (this also updates the org with the secret hash)
    const credentials = await createClientCredentials(org.id);

    // Link organization to request
    await this.requestRepo.updateStatus(id, {
      status: "APPROVED",
      reviewedBy: ctx.userId,
      reviewNotes: dto.reviewNotes,
      organizationId: org.id,
    });

    await auditService.log({
      organizationId: org.id,
      userId: ctx.userId,
      action: "PARTNER_REQUEST_APPROVED",
      resource: "partner_request",
      resourceId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      payload: { organizationId: org.id },
    });

    return {
      applicationId: id,
      status: "APPROVED",
      organization: {
        id: org.id,
        clientId: org.clientId,
        name: org.name,
      },
      credentials: {
        clientId: org.clientId,
        clientSecret: credentials.clientSecret,
      },
      message:
        "Application approved. Share credentials with the partner securely.",
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private toDto(request: {
    id: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    website: string | null;
    integrationType: string;
    estimatedVolume: number | null;
    useCase: string;
    status: string;
    reviewNotes: string | null;
    rejectionReason: string | null;
    organizationId: string | null;
    requestedAt: Date;
    reviewedAt: Date | null;
    approvedAt: Date | null;
  }): PartnerRequestDto {
    return {
      id: request.id,
      companyName: request.companyName,
      contactName: request.contactName,
      contactEmail: request.contactEmail,
      website: request.website,
      integrationType: request.integrationType,
      estimatedVolume: request.estimatedVolume,
      useCase: request.useCase,
      status: request.status as PartnerRequestDto["status"],
      reviewNotes: request.reviewNotes,
      rejectionReason: request.rejectionReason,
      organizationId: request.organizationId,
      requestedAt: request.requestedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      approvedAt: request.approvedAt?.toISOString() ?? null,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const partnerRequestService = new PartnerRequestService();
