import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware for route protection.
 *
 * Strategy: Check for the presence of a session cookie or authorization header.
 * Full token verification happens in API routes via verifyAuthToken().
 * Middleware provides a fast client-side redirect for unauthenticated users.
 *
 * NOTE: We cannot use firebase-admin in Edge Runtime (middleware runs at the edge).
 * Token verification is deferred to the Node.js API route handlers.
 */

const PUBLIC_PATHS = ["/", "/login"];
const API_AUTH_PATHS = ["/api/auth"];
const CRON_PATHS = ["/api/cron/"];
const STATIC_PATHS = ["/_next/", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Allow auth API endpoints (login/signup flow)
  if (API_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cron paths use CRON_SECRET — validated in route handlers
  if (CRON_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // For API routes: check Authorization header
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Token validity is checked in route handlers via verifyAuthToken()
    return NextResponse.next();
  }

  // For dashboard pages: check for __session cookie (set by client after sign-in)
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
