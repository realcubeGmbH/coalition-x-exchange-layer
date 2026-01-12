/**
 * JWT Utilities
 * Using jose for JWT operations (Edge-compatible)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";
import { authConfig, TOKEN_SCOPES } from "./config";
import type { TokenScope } from "./config";

// =============================================================================
// Zod Schemas for JWT Payloads
// =============================================================================

const TokenScopeSchema = z.enum(
  Object.keys(TOKEN_SCOPES) as [TokenScope, ...TokenScope[]]
);

const AccessTokenPayloadSchema = z.object({
  sub: z.string(), // User ID
  orgId: z.string().nullable(), // Organization ID (null for SYSTEM_ADMIN)
  role: z.string(), // User role
  scopes: z.array(TokenScopeSchema),
  type: z.literal("access"),
  isSystemAdmin: z.boolean().optional(), // True for SYSTEM_ADMIN users
  // Standard JWT claims (optional, added by jose)
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
});

const RefreshTokenPayloadSchema = z.object({
  sub: z.string(), // User ID
  orgId: z.string().nullable(), // Organization ID (null for SYSTEM_ADMIN)
  tokenId: z.string(), // ApiToken ID for revocation
  type: z.literal("refresh"),
  isSystemAdmin: z.boolean().optional(), // True for SYSTEM_ADMIN users
  // Standard JWT claims (optional)
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
});

// =============================================================================
// Types (derived from Zod schemas)
// =============================================================================

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema> & JWTPayload;
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema> & JWTPayload;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the JWT secret as Uint8Array (required by jose)
 */
function getSecretKey(): Uint8Array {
  const secret = authConfig.jwt.secret;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generate an access token (JWT)
 */
export async function generateAccessToken(payload: {
  userId: string;
  organizationId: string | null; // Null for SYSTEM_ADMIN
  role: string;
  scopes: TokenScope[];
}): Promise<string> {
  const expiresIn = parseDuration(authConfig.jwt.accessTokenExpiry);
  const isSystemAdmin = payload.role === "SYSTEM_ADMIN";

  const tokenPayload = {
    sub: payload.userId,
    orgId: payload.organizationId,
    role: payload.role,
    scopes: payload.scopes,
    type: "access" as const,
    ...(isSystemAdmin && { isSystemAdmin: true }),
  };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(authConfig.jwt.issuer)
    .setAudience(authConfig.jwt.audience)
    .setExpirationTime(`${expiresIn}s`)
    .sign(getSecretKey());
}

/**
 * Generate a refresh token (JWT)
 */
export async function generateRefreshToken(payload: {
  userId: string;
  organizationId: string | null; // Null for SYSTEM_ADMIN
  tokenId: string;
  role?: string;
}): Promise<string> {
  const expiresIn = parseDuration(authConfig.jwt.refreshTokenExpiry);
  const isSystemAdmin = payload.role === "SYSTEM_ADMIN";

  const tokenPayload = {
    sub: payload.userId,
    orgId: payload.organizationId,
    tokenId: payload.tokenId,
    type: "refresh" as const,
    ...(isSystemAdmin && { isSystemAdmin: true }),
  };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(authConfig.jwt.issuer)
    .setAudience(authConfig.jwt.audience)
    .setExpirationTime(`${expiresIn}s`)
    .sign(getSecretKey());
}

// =============================================================================
// Token Verification
// =============================================================================

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });

    // Validate payload structure with Zod
    const result = AccessTokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      return null;
    }

    // Return validated payload with JWT claims
    return { ...result.data, ...payload };
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });

    // Validate payload structure with Zod
    const result = RefreshTokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      return null;
    }

    // Return validated payload with JWT claims
    return { ...result.data, ...payload };
  } catch {
    return null;
  }
}
