import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATIC_PATTERNS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/images?\//,
  /^\/fonts?\//,
];

function isStaticAsset(path: string): boolean {
  return STATIC_PATTERNS.some((p) => p.test(path));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
