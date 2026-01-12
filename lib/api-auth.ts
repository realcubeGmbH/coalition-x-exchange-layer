/**
 * API Authentication Middleware
 * Verifies JWT tokens for protected API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import prisma from "./prisma";

// =============================================================================
// Types
// =============================================================================

export interface AuthenticatedRequest {
  userId: string;
  organizationId: string | null; // Null for SYSTEM_ADMIN (cross-tenant access)
  role: string;
  scopes: string[];
  isOrgLevel: boolean; // True if using org-level API token (not user-specific)
  isSystemAdmin: boolean; // True if SYSTEM_ADMIN (has cross-tenant access)
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  auth: AuthenticatedRequest,
  params: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

// =============================================================================
// Error Responses
// =============================================================================

export function unauthorizedResponse(
  message = "Unauthorized",
  code = "UNAUTHORIZED"
) {
  return NextResponse.json(
    {
      error: "unauthorized",
      message,
      code,
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message = "Forbidden", code = "FORBIDDEN") {
  return NextResponse.json(
    {
      error: "forbidden",
      message,
      code,
    },
    { status: 403 }
  );
}

export function badRequestResponse(
  message: string,
  code: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: "bad_request",
      message,
      code,
      ...(details !== undefined && typeof details === "object" ? details : {}),
    },
    { status: 400 }
  );
}

export function notFoundResponse(
  message = "Resource not found",
  code = "NOT_FOUND"
) {
  return NextResponse.json(
    {
      error: "not_found",
      message,
      code,
    },
    { status: 404 }
  );
}

export function internalErrorResponse(message = "Internal server error") {
  return NextResponse.json(
    {
      error: "internal_error",
      message,
    },
    { status: 500 }
  );
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Extract and verify access token from request
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  // Extract token from Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // Verify JWT
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  // System admins have cross-tenant access and don't need ApiToken validation
  const isSystemAdmin = payload.isSystemAdmin === true || payload.role === "SYSTEM_ADMIN";
  
  if (isSystemAdmin) {
    return {
      userId: payload.sub,
      organizationId: null, // System admins operate above tenant layer
      role: payload.role,
      scopes: payload.scopes,
      isOrgLevel: false,
      isSystemAdmin: true,
    };
  }

  // For non-system admins, require organizationId
  if (!payload.orgId) {
    return null;
  }

  // Check if token is revoked (for organization-scoped users)
  const apiToken = await prisma.apiToken.findFirst({
    where: {
      organizationId: payload.orgId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  // For org-level tokens (API key exchange), we don't require a matching ApiToken record
  // as they're generated on-the-fly during token exchange
  const isOrgLevel = payload.sub.startsWith("org:");

  if (!isOrgLevel && !apiToken) {
    return null;
  }

  return {
    userId: payload.sub,
    organizationId: payload.orgId,
    role: payload.role,
    scopes: payload.scopes,
    isOrgLevel,
    isSystemAdmin: false,
  };
}

/**
 * Check if user has required scope
 */
export function hasScope(
  auth: AuthenticatedRequest,
  requiredScope: string
): boolean {
  return auth.scopes.includes(requiredScope);
}

/**
 * Check if user has any of the required scopes
 */
export function hasAnyScope(
  auth: AuthenticatedRequest,
  requiredScopes: string[]
): boolean {
  return requiredScopes.some((scope) => auth.scopes.includes(scope));
}

/**
 * Check if user has all required scopes
 */
export function hasAllScopes(
  auth: AuthenticatedRequest,
  requiredScopes: string[]
): boolean {
  return requiredScopes.every((scope) => auth.scopes.includes(scope));
}

// =============================================================================
// Middleware Wrapper
// =============================================================================

/**
 * Wrap an API handler with authentication
 */
export function withAuth(
  handler: ApiHandler,
  options: {
    requiredScopes?: string[];
    anyScope?: boolean; // If true, only one of the scopes is required
  } = {}
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // Authenticate
      const auth = await authenticateRequest(request);

      if (!auth) {
        return unauthorizedResponse(
          "Invalid or expired access token",
          "INVALID_TOKEN"
        );
      }

      // Check scopes
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        const hasRequired = options.anyScope
          ? hasAnyScope(auth, options.requiredScopes)
          : hasAllScopes(auth, options.requiredScopes);

        if (!hasRequired) {
          return forbiddenResponse(
            `Missing required scope(s): ${options.requiredScopes.join(", ")}`,
            "INSUFFICIENT_SCOPE"
          );
        }
      }

      // Call handler - pass params as Promise for Next.js 15 compatibility
      return await handler(request, auth, { params: context.params });
    } catch (error) {
      console.error("API handler error:", error);
      return internalErrorResponse();
    }
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent");
}

/**
 * Require organizationId for tenant-scoped operations.
 * Returns a response if the user doesn't have an organization context (e.g., system admin without tenant).
 * Use this guard at the start of route handlers that require tenant isolation.
 */
export function requireOrganizationId(
  auth: AuthenticatedRequest
): auth is AuthenticatedRequest & { organizationId: string } {
  return auth.organizationId !== null;
}

/**
 * Get a forbidden response for missing tenant context
 */
export function noTenantContextResponse(): NextResponse {
  return forbiddenResponse(
    "This endpoint requires a tenant context. System admins must specify an organization.",
    "NO_TENANT_CONTEXT"
  );
}
