/**
 * Organization Service
 *
 * Business logic layer for Organization operations.
 * Orchestrates repository calls and audit logging.
 */

import {
  organizationRepository,
  type OrganizationWithCounts,
} from "@/lib/repositories/organization.repository";
import { auditService } from "./audit.service";
import { ApiError } from "@/lib/core/ErrorHandler";
import { createClientCredentials, rotateClientSecret } from "@/lib/auth";
import type { ServiceContext } from "@/lib/domain/shared";
import {
  createPaginatedResult,
  type PaginatedResult,
} from "@/lib/domain/shared";
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  ListOrganizationsQueryDto,
  OrganizationDto,
  OrganizationDetailsDto,
  OrganizationCredentialsDto,
  CredentialsStatusDto,
} from "@/lib/domain/organization";

// =============================================================================
// Service Class
// =============================================================================

export class OrganizationService {
  constructor(private repository = organizationRepository) {}

  // ===========================================================================
  // List Operations
  // ===========================================================================

  /**
   * List organizations with pagination and filters
   */
  async list(
    query: ListOrganizationsQueryDto
  ): Promise<PaginatedResult<OrganizationDto>> {
    const { type, status, page, limit } = query;

    const filters = {
      ...(type && { type }),
      ...(status && { status }),
    };

    const [orgs, total] = await Promise.all([
      this.repository.findMany({
        filters,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.repository.count(filters),
    ]);

    const data = orgs.map(this.toOrganizationDto);
    return createPaginatedResult(data, page, limit, total);
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Get organization details by ID
   */
  async getById(id: string): Promise<OrganizationDetailsDto> {
    const org = await this.repository.findByIdWithDetails(id);

    if (!org) {
      throw ApiError.notFound("Organization", id);
    }

    return this.toOrganizationDetailsDto(org);
  }

  /**
   * Create a new organization
   * Admin-created organizations are immediately ACTIVE with credentials
   */
  async create(
    dto: CreateOrganizationDto,
    ctx: ServiceContext
  ): Promise<OrganizationDto & { credentials?: { clientId: string; clientSecret: string } }> {
    // Business rule: no duplicate names
    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw ApiError.duplicate("Organization", "name");
    }

    // Admin-created organizations are immediately ACTIVE
    const org = await this.repository.create({
      name: dto.name,
      type: dto.type,
      status: "ACTIVE",
    });

    // Generate credentials for ACCREDITED_PARTNER organizations
    let credentials: { clientId: string; clientSecret: string } | undefined;
    if (dto.type === "ACCREDITED_PARTNER") {
      credentials = await createClientCredentials(org.id);
    }

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ORG_CREATED",
      resource: "organization",
      resourceId: org.id,
      payload: { ...dto, credentialsGenerated: !!credentials },
    });

    return {
      ...this.toOrganizationDto(org as OrganizationWithCounts),
      credentials,
    };
  }

  /**
   * Update an organization
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
    ctx: ServiceContext
  ): Promise<OrganizationDto> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw ApiError.notFound("Organization", id);
    }

    // Business rule: cannot modify ADMIN organizations
    if (existing.type === "ADMIN") {
      throw ApiError.forbidden("Cannot modify platform admin organization");
    }

    const updated = await this.repository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.status && { status: dto.status }),
    });

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ORG_UPDATED",
      resource: "organization",
      resourceId: id,
      payload: { changes: dto, previousStatus: existing.status },
    });

    return this.toOrganizationDto(updated as OrganizationWithCounts);
  }

  /**
   * Soft delete (deactivate) an organization
   */
  async delete(id: string, ctx: ServiceContext): Promise<void> {
    const existing = await this.repository.findByIdWithDetails(id);

    if (!existing) {
      throw ApiError.notFound("Organization", id);
    }

    // Business rule: cannot delete ADMIN organizations
    if (existing.type === "ADMIN") {
      throw ApiError.forbidden("Cannot delete platform admin organization");
    }

    // Soft delete by setting status to INACTIVE
    await this.repository.updateStatus(id, "INACTIVE");

    // Revoke all active tokens
    await this.repository.revokeAllTokens(id, `admin:${ctx.userId}`);

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ORG_DELETED",
      resource: "organization",
      resourceId: id,
      payload: {
        organizationName: existing.name,
        userCount: existing._count.users,
        assetCount: existing._count.assets,
      },
    });
  }

  // ===========================================================================
  // Activation
  // ===========================================================================

  /**
   * Activate a pending organization
   */
  async activate(id: string, ctx: ServiceContext): Promise<OrganizationDto> {
    const org = await this.repository.findById(id);

    if (!org) {
      throw ApiError.notFound("Organization", id);
    }

    // Business rules
    if (org.status === "ACTIVE") {
      throw ApiError.duplicate("Organization is already active");
    }

    if (org.status === "SUSPENDED") {
      throw ApiError.forbidden(
        "Cannot activate a suspended organization. Use PATCH to change status first."
      );
    }

    const updated = await this.repository.updateStatus(id, "ACTIVE");

    // Audit log
    await auditService.logEvent(ctx, {
      action: "ORG_ACTIVATED",
      resource: "organization",
      resourceId: id,
      payload: {
        organizationName: org.name,
        previousStatus: org.status,
      },
    });

    return this.toOrganizationDto(updated as OrganizationWithCounts);
  }

  // ===========================================================================
  // Credentials Management
  // ===========================================================================

  /**
   * Get credentials status for an organization
   */
  async getCredentialsStatus(id: string): Promise<CredentialsStatusDto> {
    const org = await this.repository.findById(id);

    if (!org) {
      throw ApiError.notFound("Organization", id);
    }

    return {
      hasCredentials: !!org.clientSecretHash,
      clientId: org.clientId,
      clientSecretConfigured: !!org.clientSecretHash,
    };
  }

  /**
   * Generate or rotate OAuth credentials
   */
  async generateCredentials(
    id: string,
    rotate: boolean,
    ctx: ServiceContext
  ): Promise<OrganizationCredentialsDto> {
    const org = await this.repository.findById(id);

    if (!org) {
      throw ApiError.notFound("Organization", id);
    }

    // Business rules
    if (org.type !== "ACCREDITED_PARTNER") {
      throw ApiError.forbidden(
        "Only ACCREDITED_PARTNER organizations can have OAuth credentials"
      );
    }

    if (org.status !== "ACTIVE") {
      throw ApiError.forbidden(
        `Organization must be ACTIVE to generate credentials. Current status: ${org.status}`
      );
    }

    // Check if credentials already exist
    if (org.clientSecretHash && !rotate) {
      throw ApiError.duplicate(
        "Credentials already exist. Set rotate: true to generate new ones."
      );
    }

    // Generate or rotate credentials
    const credentials =
      org.clientSecretHash && rotate
        ? await rotateClientSecret(id)
        : await createClientCredentials(id);

    // Audit log
    await auditService.logEvent(ctx, {
      action: rotate ? "API_CREDENTIALS_ROTATED" : "API_CREDENTIALS_CREATED",
      resource: "organization",
      resourceId: id,
      payload: {
        organizationName: org.name,
        rotated: rotate,
      },
    });

    return {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    };
  }

  // ===========================================================================
  // Transformers
  // ===========================================================================

  private toOrganizationDto(
    org:
      | OrganizationWithCounts
      | {
          id: string;
          clientId: string;
          name: string;
          type: string;
          status: string;
          createdAt: Date;
          updatedAt: Date;
          _count?: { users: number; assets: number };
        }
  ): OrganizationDto {
    return {
      id: org.id,
      clientId: org.clientId,
      name: org.name,
      type: org.type as OrganizationDto["type"],
      status: org.status as OrganizationDto["status"],
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      userCount: org._count?.users,
      assetCount: org._count?.assets,
    };
  }

  private toOrganizationDetailsDto(org: {
    id: string;
    clientId: string;
    name: string;
    type: string;
    status: string;
    apiKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: { users: number; assets: number; apiTokens: number };
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      createdAt: Date;
    }>;
  }): OrganizationDetailsDto {
    return {
      id: org.id,
      clientId: org.clientId,
      name: org.name,
      type: org.type as OrganizationDetailsDto["type"],
      status: org.status as OrganizationDetailsDto["status"],
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      hasApiKey: !!org.apiKey,
      counts: {
        users: org._count.users,
        assets: org._count.assets,
        apiTokens: org._count.apiTokens,
      },
      recentUsers: org.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const organizationService = new OrganizationService();
