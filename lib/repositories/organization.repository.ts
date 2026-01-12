/**
 * Organization Repository
 *
 * Data access layer for Organization operations.
 * All Prisma queries for organizations are centralized here.
 */

import prisma from "@/lib/prisma";
import type { Organization, OrgStatus, OrgType, Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type OrganizationWithCounts = Organization & {
  _count: {
    users: number;
    assets: number;
    apiTokens?: number;
  };
};

export type OrganizationWithUsers = Organization & {
  _count: {
    users: number;
    assets: number;
    apiTokens: number;
  };
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
  }>;
};

export interface OrganizationFilters {
  type?: OrgType;
  status?: OrgStatus;
}

// =============================================================================
// Repository Class
// =============================================================================

export class OrganizationRepository {
  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } });
  }

  /**
   * Find organization by ID with counts and users
   */
  async findByIdWithDetails(id: string): Promise<OrganizationWithUsers | null> {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            apiTokens: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          take: 10,
        },
      },
    });
  }

  /**
   * Find organization by name
   */
  async findByName(name: string): Promise<Organization | null> {
    return prisma.organization.findFirst({ where: { name } });
  }

  /**
   * Find organization by client ID
   */
  async findByClientId(clientId: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { clientId } });
  }

  /**
   * Find many organizations with filters and pagination
   */
  async findMany(params: {
    filters?: OrganizationFilters;
    skip?: number;
    take?: number;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
  }): Promise<OrganizationWithCounts[]> {
    const where = this.buildWhereClause(params.filters);

    return prisma.organization.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
          },
        },
      },
    });
  }

  /**
   * Count organizations with filters
   */
  async count(filters?: OrganizationFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.organization.count({ where });
  }

  /**
   * Create a new organization
   */
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return prisma.organization.create({ data });
  }

  /**
   * Update an organization
   */
  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput
  ): Promise<Organization> {
    return prisma.organization.update({ where: { id }, data });
  }

  /**
   * Update organization status
   */
  async updateStatus(id: string, status: OrgStatus): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update organization credentials
   */
  async updateCredentials(
    id: string,
    clientSecretHash: string
  ): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: { clientSecretHash },
    });
  }

  /**
   * Revoke all active tokens for an organization
   */
  async revokeAllTokens(
    organizationId: string,
    revokedBy: string
  ): Promise<number> {
    const result = await prisma.apiToken.updateMany({
      where: {
        organizationId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedBy,
      },
    });
    return result.count;
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(
    filters?: OrganizationFilters
  ): Prisma.OrganizationWhereInput {
    if (!filters) return {};

    const where: Prisma.OrganizationWhereInput = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return where;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const organizationRepository = new OrganizationRepository();
