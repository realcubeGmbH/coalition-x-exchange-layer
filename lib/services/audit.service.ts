/**
 * Audit Service
 *
 * Business logic layer for audit logging.
 * Provides a simplified interface for services to log audit events.
 */

import {
  auditRepository,
  type CreateAuditLogParams,
  type AuditLogFilters,
} from "@/lib/repositories/audit.repository";
import type { ServiceContext } from "@/lib/domain/shared";
import type { AuditAction, AuditLog } from "@prisma/client";
import { createPaginatedResult, type PaginatedResult } from "@/lib/domain/shared";

// =============================================================================
// Types
// =============================================================================

export interface LogEventParams {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  payload?: object;
  response?: object;
  schemaVersion?: string;
}

// =============================================================================
// Service Class
// =============================================================================

export class AuditService {
  constructor(private repository = auditRepository) {}

  /**
   * Log an audit event using service context
   * This is the primary method services should use for audit logging
   */
  async logEvent(ctx: ServiceContext, params: LogEventParams): Promise<void> {
    try {
      await this.repository.create({
        organizationId: ctx.organizationId,
        userId: ctx.isOrgLevel ? null : ctx.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        method: params.method,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        payload: params.payload,
        response: params.response,
        schemaVersion: params.schemaVersion,
      });
    } catch (error) {
      // Audit failures should not break the main flow
      console.error("Failed to write audit log:", error);
    }
  }

  /**
   * Log an audit event with explicit parameters (for cases without ServiceContext)
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.repository.create(params);
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(
    filters: AuditLogFilters,
    page: number,
    limit: number
  ): Promise<PaginatedResult<AuditLog>> {
    const [logs, total] = await Promise.all([
      this.repository.findMany({
        filters,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(logs, page, limit, total);
  }

  /**
   * Get audit history for a specific resource
   */
  async getResourceHistory(
    resource: string,
    resourceId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    return this.repository.findByResource(resource, resourceId, { take: limit });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const auditService = new AuditService();
