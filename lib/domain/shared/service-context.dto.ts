/**
 * Service Context DTO
 *
 * Passed from route handlers to services to provide
 * authentication and request context for business logic operations.
 */

/**
 * Context passed from authenticated route handlers to service methods.
 * Contains user/org identification and request metadata for audit logging.
 */
export interface ServiceContext {
  /** User ID (or org:orgId for org-level API tokens) */
  userId: string;

  /** Organization ID - used for multi-tenant data isolation. Null for SYSTEM_ADMIN. */
  organizationId: string | null;

  /** Client IP address for audit logging */
  ipAddress: string;

  /** User agent string for audit logging */
  userAgent: string | null;

  /** True if using org-level API token (not user-specific) */
  isOrgLevel: boolean;

  /** True if SYSTEM_ADMIN with cross-tenant access */
  isSystemAdmin: boolean;
}

/**
 * Create a ServiceContext from authenticated request data.
 * Use this helper in route handlers to build the context.
 */
export function createServiceContext(params: {
  userId: string;
  organizationId: string | null;
  ipAddress: string;
  userAgent: string | null;
  isOrgLevel: boolean;
  isSystemAdmin?: boolean;
}): ServiceContext {
  return {
    userId: params.userId,
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    isOrgLevel: params.isOrgLevel,
    isSystemAdmin: params.isSystemAdmin ?? false,
  };
}
