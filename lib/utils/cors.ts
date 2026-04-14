import { NextResponse } from "next/server";

/**
 * CORS configuration driven by a single env variable:
 *
 *   CORS_ALLOWED_ORIGINS=https://app.coalitionx.com
 *
 * Multiple origins can be comma-separated:
 *   CORS_ALLOWED_ORIGINS=https://app.coalitionx.com,https://staging.coalitionx.com
 *
 * In development (NODE_ENV !== "production"), if the variable is unset
 * every origin is accepted so local dev works without extra configuration.
 * In production the variable MUST be set; requests from unlisted origins
 * receive no CORS headers and will be blocked by the browser.
 */

const corsOriginsEnv = process.env.CORS_ALLOWED_ORIGINS ?? "";
const isDev = process.env.NODE_ENV !== "production";

const allowedOrigins: Set<string> | null = corsOriginsEnv
  ? new Set(corsOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean))
  : null;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (isDev && !allowedOrigins) return true;
  return allowedOrigins?.has(origin) ?? false;
}

export function addCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  if (!origin || !isOriginAllowed(origin)) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function handlePreflight(origin: string | null): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response, origin);
}
