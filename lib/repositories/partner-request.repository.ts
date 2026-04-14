/**
 * Accredited Partner Repository
 *
 * Data access layer for AccreditedPartner sync records.
 */

import prisma from "@/lib/prisma";
import type { AccreditedPartner, Prisma } from "@prisma/client";

// =============================================================================
// Repository Class
// =============================================================================

export class AccreditedPartnerRepository {
  async create(data: Prisma.AccreditedPartnerUncheckedCreateInput): Promise<AccreditedPartner> {
    return prisma.accreditedPartner.create({ data });
  }

  async findById(id: string): Promise<AccreditedPartner | null> {
    return prisma.accreditedPartner.findUnique({ where: { id } });
  }

  async findByExternalOrgId(externalOrgId: string): Promise<AccreditedPartner[]> {
    return prisma.accreditedPartner.findMany({
      where: { externalOrgId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByEmail(email: string): Promise<AccreditedPartner[]> {
    return prisma.accreditedPartner.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const accreditedPartnerRepository = new AccreditedPartnerRepository();
