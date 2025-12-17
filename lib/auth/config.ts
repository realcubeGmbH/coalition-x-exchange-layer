/**
 * Authentication Configuration
 * Based on project specs: OAuth 2.0 with JWT tokens
 */

export const authConfig = {
  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET!,
    issuer: "coalition-x",
    audience: "coalition-x-api",
    accessTokenExpiry: "1h", // 1 hour per spec
    refreshTokenExpiry: "30d", // 30 days per spec
  },

  // Session Settings (Web UI)
  session: {
    tokenExpiry: "24h", // 24 hours per spec
  },

  // API Key Settings
  apiKey: {
    prefix: "cx_", // Coalition X prefix
    length: 32,
  },

  // Password Settings
  password: {
    saltRounds: 12,
    minLength: 8,
  },

  // Rate Limiting (per spec)
  rateLimit: {
    ACCREDITED_PARTNER: {
      requestsPerHour: 10000,
      buildingsPerRequest: 1000,
    },
    CLIENT: {
      requestsPerHour: 100,
      buildingsPerRequest: 10,
    },
  },
} as const;

// Token scopes for authorization
export const TOKEN_SCOPES = {
  // Building operations
  "buildings:read": "Read buildings",
  "buildings:write": "Create/update buildings",
  "buildings:delete": "Delete buildings",

  // KPI operations
  "kpis:read": "Read KPI data",
  "kpis:write": "Submit KPI data",

  // Admin operations
  "admin:users": "Manage users",
  "admin:tokens": "Manage API tokens",
  "admin:audit": "View audit logs",
} as const;

export type TokenScope = keyof typeof TOKEN_SCOPES;
