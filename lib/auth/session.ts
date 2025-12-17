/**
 * Session Utilities
 * Helper functions for extracting auth context from requests
 */

import { headers } from "next/headers";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
  scopes: string[];
}

/**
 * Get the current auth context from request headers
 * (Set by middleware after JWT verification)
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const headersList = await headers();

  const userId = headersList.get("x-user-id");
  const organizationId = headersList.get("x-org-id");
  const role = headersList.get("x-user-role");
  const scopesHeader = headersList.get("x-user-scopes");

  if (!userId || !organizationId || !role) {
    return null;
  }

  return {
    userId,
    organizationId,
    role,
    scopes: scopesHeader ? scopesHeader.split(",") : [],
  };
}

/**
 * Check if user has a specific scope
 */
export async function hasScope(scope: string): Promise<boolean> {
  const context = await getAuthContext();
  if (!context) return false;
  return context.scopes.includes(scope);
}

/**
 * Check if user has any of the specified roles
 */
export async function hasRole(...roles: string[]): Promise<boolean> {
  const context = await getAuthContext();
  if (!context) return false;
  return roles.includes(context.role);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    throw new Error("Authentication required");
  }
  return context;
}

/**
 * Require specific scope - throws if not authorized
 */
export async function requireScope(scope: string): Promise<AuthContext> {
  const context = await requireAuth();
  if (!context.scopes.includes(scope)) {
    throw new Error(`Missing required scope: ${scope}`);
  }
  return context;
}
