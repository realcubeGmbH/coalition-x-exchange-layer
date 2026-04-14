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
      assetsPerRequest: 1000,
    },
    CLIENT: {
      requestsPerHour: 100,
      assetsPerRequest: 10,
    },
  },
} as const;

// Token scopes for authorization
export const TOKEN_SCOPES = {
  // Asset operations
  "assets:read": "Read asset data",
  "assets:write": "Create and update assets",
  "assets:delete": "Delete assets",

  // KPI operations
  "kpis:read": "Read KPI data",
  "kpis:write": "Submit KPI data",

  // Submission tracking
  "submissions:read": "Read submission history",

  // Admin operations
  "admin:users": "Manage users",
  "admin:tokens": "Manage API tokens",
  "admin:audit": "View audit logs",
  "admin:organizations": "Manage organizations (system admin only)",

  // Partner sync
  "partner:org-sync": "Sync accredited partner data from POM+",
} as const;

export type TokenScope = keyof typeof TOKEN_SCOPES;

// Role-to-Scope mappings
export const ROLE_SCOPES: Record<string, TokenScope[]> = {
  // System Admin - has ALL scopes (platform-level access)
  SYSTEM_ADMIN: Object.keys(TOKEN_SCOPES) as TokenScope[],

  // Organization Admin (legacy)
  ADMIN: [
    "assets:read",
    "assets:write",
    "assets:delete",
    "kpis:read",
    "kpis:write",
    "submissions:read",
    "admin:users",
    "admin:tokens",
    "admin:audit",
  ],

  // Partner Admin - can manage their organization
  PARTNER_ADMIN: [
    "assets:read",
    "assets:write",
    "assets:delete",
    "kpis:read",
    "kpis:write",
    "submissions:read",
    "admin:users",
    "admin:tokens",
    "admin:audit",
  ],

  // Partner User - can submit data
  PARTNER_USER: [
    "assets:read",
    "assets:write",
    "kpis:read",
    "kpis:write",
    "submissions:read",
  ],

  // Partner API - M2M access for accredited partners
  PARTNER_API: [
    "assets:read",
    "assets:write",
    "kpis:read",
    "kpis:write",
    "submissions:read",
  ],

  // Client Admin
  CLIENT_ADMIN: [
    "assets:read",
    "assets:write",
    "kpis:read",
    "kpis:write",
    "submissions:read",
    "admin:users",
  ],

  // Client User - limited access
  CLIENT_USER: [
    "assets:read",
    "kpis:read",
    "submissions:read",
  ],
};
