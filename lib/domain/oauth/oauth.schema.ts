/**
 * OAuth Schemas
 *
 * Zod validation schemas for OAuth 2.0 operations.
 */

import { z } from "zod";

// =============================================================================
// Token Request
// =============================================================================

export const OAuthTokenRequestSchema = z.object({
  grant_type: z.enum(["client_credentials", "refresh_token"]),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type OAuthTokenRequestInput = z.infer<typeof OAuthTokenRequestSchema>;

// =============================================================================
// Token Revocation
// =============================================================================

export const RevokeTokenSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

export type RevokeTokenInput = z.infer<typeof RevokeTokenSchema>;

// =============================================================================
// Token Introspection
// =============================================================================

export const IntrospectTokenSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

export type IntrospectTokenInput = z.infer<typeof IntrospectTokenSchema>;
