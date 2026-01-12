/**
 * OAuth DTOs
 *
 * Data Transfer Objects for OAuth 2.0 operations.
 */

// =============================================================================
// Input DTOs (Requests)
// =============================================================================

/**
 * OAuth token request (client_credentials grant)
 */
export interface ClientCredentialsDto {
  grantType: "client_credentials";
  clientId: string;
  clientSecret: string;
  scope?: string;
}

/**
 * OAuth token request (refresh_token grant)
 */
export interface RefreshTokenGrantDto {
  grantType: "refresh_token";
  refreshToken: string;
}

/**
 * Token revocation request
 */
export interface RevokeTokenDto {
  token: string;
  tokenTypeHint?: "access_token" | "refresh_token";
}

/**
 * Token introspection request
 */
export interface IntrospectTokenDto {
  token: string;
  tokenTypeHint?: "access_token" | "refresh_token";
}

// =============================================================================
// Output DTOs (Responses)
// =============================================================================

/**
 * OAuth token response (RFC 6749)
 */
export interface OAuthTokenResponseDto {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Token introspection response (RFC 7662)
 */
export interface IntrospectionResponseDto {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
  sub?: string;
  // Custom claims
  org_id?: string;
  role?: string;
}
