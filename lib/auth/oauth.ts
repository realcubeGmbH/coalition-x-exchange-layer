/**
 * OAuth 2.0 Utilities
 * Client credentials management for M2M authentication
 */

import { randomBytes } from "crypto";
import { hashToken } from "./tokens";
import prisma from "../prisma";

/**
 * Generate a new client secret
 */
export function generateClientSecret(): string {
  const secret = randomBytes(32).toString("base64url");
  return `cxs_${secret}`; // Coalition X Secret prefix
}

/**
 * Create OAuth client credentials for an organization
 */
export async function createClientCredentials(organizationId: string): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const clientSecret = generateClientSecret();
  const clientSecretHash = hashToken(clientSecret);

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { clientSecretHash },
    select: { clientId: true },
  });

  return {
    clientId: org.clientId,
    clientSecret,
  };
}

/**
 * Rotate client secret (generates new secret, invalidates old one)
 */
export async function rotateClientSecret(organizationId: string): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  // Revoke all existing tokens for this organization
  await prisma.apiToken.updateMany({
    where: { organizationId, revoked: false },
    data: {
      revoked: true,
      revokedAt: new Date(),
      revokedBy: "secret_rotation",
    },
  });

  // Generate new credentials
  return createClientCredentials(organizationId);
}

/**
 * Validate client credentials
 */
export async function validateClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<{
  valid: boolean;
  organization?: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  error?: string;
}> {
  const organization = await prisma.organization.findUnique({
    where: { clientId },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      clientSecretHash: true,
    },
  });

  if (!organization) {
    return { valid: false, error: "invalid_client" };
  }

  if (organization.status !== "ACTIVE") {
    return { valid: false, error: "client_suspended" };
  }

  if (!organization.clientSecretHash) {
    return { valid: false, error: "credentials_not_configured" };
  }

  const secretHash = hashToken(clientSecret);
  if (organization.clientSecretHash !== secretHash) {
    return { valid: false, error: "invalid_client" };
  }

  return {
    valid: true,
    organization: {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      status: organization.status,
    },
  };
}

/**
 * OAuth 2.0 standard scopes for Coalition X
 */
export const OAUTH_SCOPES = {
  "assets:read": "Read asset/building data",
  "assets:write": "Create and update assets",
  "kpis:read": "Read KPI data",
  "kpis:write": "Submit and update KPI data",
  "submissions:read": "Read submission history",
} as const;

export type OAuthScope = keyof typeof OAUTH_SCOPES;

/**
 * Type predicate to check if a string is a valid OAuthScope
 */
export function isOAuthScope(value: string): value is OAuthScope {
  return value in OAUTH_SCOPES;
}

/**
 * Filter an array of strings to only include valid OAuth scopes
 */
export function filterValidOAuthScopes(scopes: string[]): OAuthScope[] {
  return scopes.filter(isOAuthScope);
}

/**
 * Default scopes for partner API access
 */
export const DEFAULT_PARTNER_SCOPES: OAuthScope[] = [
  "assets:read",
  "assets:write",
  "kpis:read",
  "kpis:write",
  "submissions:read",
];
