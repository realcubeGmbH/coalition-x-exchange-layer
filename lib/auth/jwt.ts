/**
 * JWT Utilities
 * Using jose for JWT operations (Edge-compatible)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { authConfig } from "./config";
import type { TokenScope } from "./config";

// JWT Payload structure
export interface AccessTokenPayload extends JWTPayload {
  sub: string; // User ID
  orgId: string; // Organization ID
  role: string; // User role
  scopes: TokenScope[];
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // User ID
  orgId: string; // Organization ID
  tokenId: string; // ApiToken ID for revocation
  type: "refresh";
}

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

/**
 * Generate an access token (JWT)
 */
export async function generateAccessToken(payload: {
  userId: string;
  organizationId: string;
  role: string;
  scopes: TokenScope[];
}): Promise<string> {
  const expiresIn = parseDuration(authConfig.jwt.accessTokenExpiry);

  return new SignJWT({
    sub: payload.userId,
    orgId: payload.organizationId,
    role: payload.role,
    scopes: payload.scopes,
    type: "access",
  } as AccessTokenPayload)
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
  organizationId: string;
  tokenId: string;
}): Promise<string> {
  const expiresIn = parseDuration(authConfig.jwt.refreshTokenExpiry);

  return new SignJWT({
    sub: payload.userId,
    orgId: payload.organizationId,
    tokenId: payload.tokenId,
    type: "refresh",
  } as RefreshTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(authConfig.jwt.issuer)
    .setAudience(authConfig.jwt.audience)
    .setExpirationTime(`${expiresIn}s`)
    .sign(getSecretKey());
}

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

    if (payload.type !== "access") {
      return null;
    }

    return payload as AccessTokenPayload;
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

    if (payload.type !== "refresh") {
      return null;
    }

    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}
