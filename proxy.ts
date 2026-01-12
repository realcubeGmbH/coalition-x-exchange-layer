/**
 * Next.js Proxy (Authentication & Authorization)
 * Intercepts requests for auth checks before reaching route handlers
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./lib/auth/jwt";

// Public routes - no auth required
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/api/auth/login", // User login (admin, clients)
  "/api/auth/register", // User registration (clients)
  "/api/auth/token", // OAuth 2.0 token endpoint (all grants)
  "/api/partner-requests", // Partner application
  "/api/health",
];

// Protected API routes requiring Bearer token
const protectedApiPrefix = "/api/";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes - require Bearer token
  if (pathname.startsWith(protectedApiPrefix)) {
    return handleApiAuth(request);
  }

  // Handle protected pages - require session cookie
  return handlePageAuth(request);
}

/**
 * Authenticate API requests via Bearer token (AC2: Source Validation)
 */
async function handleApiAuth(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Missing or invalid Authorization header",
        code: "AUTH_MISSING_TOKEN",
      },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Invalid or expired access token",
        code: "AUTH_INVALID_TOKEN",
      },
      { status: 401 }
    );
  }

  // Inject auth context into headers for route handlers
  const headers = new Headers(request.headers);
  headers.set("x-user-id", payload.sub);
  headers.set("x-org-id", payload.orgId ?? "");
  headers.set("x-user-role", payload.role);
  headers.set("x-user-scopes", payload.scopes.join(","));

  return NextResponse.next({ request: { headers } });
}

/**
 * Authenticate page requests via session cookie
 */
async function handlePageAuth(request: NextRequest): Promise<NextResponse> {
  const sessionToken = request.cookies.get("session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAccessToken(sessionToken);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  const headers = new Headers(request.headers);
  headers.set("x-user-id", payload.sub);
  headers.set("x-org-id", payload.orgId ?? "");
  headers.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
