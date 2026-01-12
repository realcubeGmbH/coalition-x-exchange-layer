/**
 * API Token Repository
 *
 * Data access layer for API Token operations.
 */

import prisma from "@/lib/prisma";
import type { ApiToken, Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type ApiTokenWithOrganization = ApiToken & {
  organization: {
    clientId: string;
    name: string;
    status: string;
  };
};

// =============================================================================
// Repository Class
// =============================================================================

export class ApiTokenRepository {
  /**
   * Find token by hash
   */
  async findByTokenHash(tokenHash: string): Promise<ApiToken | null> {
    return prisma.apiToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Find token by hash with organization details
   */
  async findByTokenHashWithOrg(tokenHash: string): Promise<ApiTokenWithOrganization | null> {
    return prisma.apiToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            clientId: true,
            name: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find token by token hash or refresh token hash
   */
  async findByAnyHash(hash: string): Promise<ApiToken | null> {
    return prisma.apiToken.findFirst({
      where: {
        OR: [{ tokenHash: hash }, { refreshToken: hash }],
        revoked: false,
      },
    });
  }

  /**
   * Find token by ID
   */
  async findById(id: string): Promise<ApiToken | null> {
    return prisma.apiToken.findUnique({ where: { id } });
  }

  /**
   * Create a new token
   */
  async create(data: Prisma.ApiTokenCreateInput): Promise<ApiToken> {
    return prisma.apiToken.create({ data });
  }

  /**
   * Revoke a token
   */
  async revoke(id: string, revokedBy: string): Promise<ApiToken> {
    return prisma.apiToken.update({
      where: { id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedBy,
      },
    });
  }

  /**
   * Revoke all tokens for an organization
   */
  async revokeAllForOrganization(organizationId: string, revokedBy: string): Promise<number> {
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
   * Find active tokens for organization
   */
  async findActiveByOrganization(organizationId: string): Promise<ApiToken[]> {
    return prisma.apiToken.findMany({
      where: {
        organizationId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count active tokens for organization
   */
  async countActiveByOrganization(organizationId: string): Promise<number> {
    return prisma.apiToken.count({
      where: {
        organizationId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const apiTokenRepository = new ApiTokenRepository();
