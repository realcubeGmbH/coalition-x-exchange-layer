/**
 * Token Management Utilities
 * Handles API keys and token generation/validation
 */

import { randomBytes, createHash } from "crypto";
import { authConfig } from "./config";
import type { TokenScope } from "./config";
import prisma from "../prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./jwt";

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  const key = randomBytes(authConfig.apiKey.length).toString("hex");
  return `${authConfig.apiKey.prefix}${key}`;
}

/**
 * Hash an API key or token for secure storage
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random token ID
 */
export function generateTokenId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Create a new token pair (access + refresh) for a user
 */
export async function createTokenPair(params: {
  userId: string;
  organizationId: string;
  role: string;
  scopes: TokenScope[];
  name?: string;
  ipAddress?: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}> {
  const tokenId = generateTokenId();

  // Calculate expiration times
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Generate tokens
  const accessToken = await generateAccessToken({
    userId: params.userId,
    organizationId: params.organizationId,
    role: params.role,
    scopes: params.scopes,
  });

  const refreshToken = await generateRefreshToken({
    userId: params.userId,
    organizationId: params.organizationId,
    tokenId,
  });

  // Store token record in database
  await prisma.apiToken.create({
    data: {
      id: tokenId,
      token: accessToken.slice(-16), // Store partial for identification
      tokenHash: hashToken(accessToken),
      organizationId: params.organizationId,
      userId: params.userId,
      name: params.name,
      scopes: params.scopes,
      expiresAt: accessExpiresAt,
      refreshToken: hashToken(refreshToken),
      refreshExpiresAt,
      lastUsedIp: params.ipAddress,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresAt: accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
} | null> {
  // Verify the refresh token
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }

  // Find the token record
  const tokenRecord = await prisma.apiToken.findUnique({
    where: { id: payload.tokenId },
    include: { user: true },
  });

  if (!tokenRecord) {
    return null;
  }

  // Check if token is revoked
  if (tokenRecord.revoked) {
    return null;
  }

  // Check if refresh token matches
  if (tokenRecord.refreshToken !== hashToken(refreshToken)) {
    return null;
  }

  // Check if refresh token is expired
  if (
    tokenRecord.refreshExpiresAt &&
    tokenRecord.refreshExpiresAt < new Date()
  ) {
    return null;
  }

  // Generate new access token
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const accessToken = await generateAccessToken({
    userId: payload.sub,
    organizationId: payload.orgId,
    role: tokenRecord.user?.role || "CLIENT_USER",
    scopes: tokenRecord.scopes as TokenScope[],
  });

  // Update token record
  await prisma.apiToken.update({
    where: { id: payload.tokenId },
    data: {
      token: accessToken.slice(-16),
      tokenHash: hashToken(accessToken),
      expiresAt: accessExpiresAt,
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return {
    accessToken,
    expiresAt: accessExpiresAt,
  };
}

/**
 * Revoke a token
 */
export async function revokeToken(
  tokenId: string,
  revokedBy: string
): Promise<void> {
  await prisma.apiToken.update({
    where: { id: tokenId },
    data: {
      revoked: true,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

/**
 * Validate an API key and return the organization
 */
export async function validateApiKey(apiKey: string) {
  const keyHash = hashToken(apiKey);

  const organization = await prisma.organization.findFirst({
    where: {
      apiKeyHash: keyHash,
      status: "ACTIVE",
    },
  });

  return organization;
}
