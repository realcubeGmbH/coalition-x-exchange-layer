/**
 * Partner Request Repository
 *
 * Data access layer for Partner Request operations.
 */

import prisma from "@/lib/prisma";
import type { PartnerRequest, PartnerRequestStatus, Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type PartnerRequestWithOrg = PartnerRequest & {
  organization: { id: string; name: string; clientId: string; status: string } | null;
};

// =============================================================================
// Repository Class
// =============================================================================

export class PartnerRequestRepository {
  /**
   * Find by ID
   */
  async findById(id: string): Promise<PartnerRequest | null> {
    return prisma.partnerRequest.findUnique({ where: { id } });
  }

  /**
   * Find by ID with organization
   */
  async findByIdWithOrg(id: string): Promise<PartnerRequestWithOrg | null> {
    return prisma.partnerRequest.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, clientId: true, status: true },
        },
      },
    });
  }

  /**
   * Find by email
   */
  async findByEmail(email: string): Promise<PartnerRequest | null> {
    return prisma.partnerRequest.findUnique({
      where: { contactEmail: email.toLowerCase() },
    });
  }

  /**
   * Create new partner request
   */
  async create(data: Prisma.PartnerRequestCreateInput): Promise<PartnerRequest> {
    return prisma.partnerRequest.create({ data });
  }

  /**
   * List with pagination
   */
  async findMany(params: {
    status?: PartnerRequestStatus;
    skip: number;
    take: number;
  }): Promise<{ data: PartnerRequestWithOrg[]; total: number }> {
    const where = params.status ? { status: params.status } : {};

    const [data, total] = await Promise.all([
      prisma.partnerRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: {
          organization: {
            select: { id: true, name: true, clientId: true, status: true },
          },
        },
      }),
      prisma.partnerRequest.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update status (approve/reject)
   */
  async updateStatus(
    id: string,
    data: {
      status: PartnerRequestStatus;
      reviewedBy: string;
      reviewNotes?: string;
      rejectionReason?: string;
      organizationId?: string;
    }
  ): Promise<PartnerRequest> {
    return prisma.partnerRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewNotes: data.reviewNotes,
        rejectionReason: data.rejectionReason,
        organizationId: data.organizationId,
        reviewedAt: new Date(),
        ...(data.status === "APPROVED" && { approvedAt: new Date() }),
      },
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const partnerRequestRepository = new PartnerRequestRepository();
