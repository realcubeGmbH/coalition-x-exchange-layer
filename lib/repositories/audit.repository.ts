/**
 * Audit Repository
 *
 * Handles all audit log database operations.
 * Centralizes audit logging logic that was previously scattered across routes.
 */

import prisma from "@/lib/prisma";
import type { AuditAction, AuditLog, Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface CreateAuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string | null;
  payload?: object;
  response?: object;
  schemaVersion?: string;
}

export interface AuditLogFilters {
  organizationId?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// Repository Class
// =============================================================================

export class AuditRepository {
  /**
   * Create an audit log entry
   */
  async create(params: CreateAuditLogParams): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        method: params.method,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        payload: params.payload as Prisma.InputJsonValue,
        response: params.response as Prisma.InputJsonValue,
        schemaVersion: params.schemaVersion,
      },
    });
  }

  /**
   * Find audit logs with filters and pagination
   */
  async findMany(params: {
    filters?: AuditLogFilters;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
  }): Promise<AuditLog[]> {
    const where = this.buildWhereClause(params.filters);

    return prisma.auditLog.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: "desc" },
    });
  }

  /**
   * Count audit logs with filters
   */
  async count(filters?: AuditLogFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.auditLog.count({ where });
  }

  /**
   * Find a single audit log by ID
   */
  async findById(id: string): Promise<AuditLog | null> {
    return prisma.auditLog.findUnique({ where: { id } });
  }

  /**
   * Find audit logs for a specific resource
   */
  async findByResource(
    resource: string,
    resourceId: string,
    options?: { take?: number }
  ): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 50,
    });
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(
    filters?: AuditLogFilters
  ): Prisma.AuditLogWhereInput {
    if (!filters) return {};

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return where;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const auditRepository = new AuditRepository();
