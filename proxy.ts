import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes — no auth required
const PUBLIC_ROUTES = ["/login", "/signup", "/invite"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js";

  if (isPublic) return NextResponse.next();

  // Auth guard is handled client-side via AuthGuard component
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
