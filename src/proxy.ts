import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { CANONICAL_APP_URL } from "@/lib/app-url";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/checkout",
  "/cart",
  "/admin",
] as const;

const GUEST_ONLY_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

function matchesPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const requestHost = request.nextUrl.hostname.toLowerCase();
  const canonicalHost = new URL(CANONICAL_APP_URL).hostname.toLowerCase();

  if (isDevelopmentHost(requestHost) || requestHost === canonicalHost) {
    return null;
  }

  const canonicalUrl = new URL(CANONICAL_APP_URL);
  canonicalUrl.pathname = request.nextUrl.pathname;
  canonicalUrl.search = request.nextUrl.search;

  return NextResponse.redirect(canonicalUrl, 308);
}

function buildLoginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (nextPath && nextPath !== "/login") {
    url.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>,
        ) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (error) {
    return matchesPrefix(pathname, PROTECTED_PREFIXES)
      ? buildLoginRedirect(request)
      : response;
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !user) {
    return buildLoginRedirect(request);
  }

  if (matchesPrefix(pathname, GUEST_ONLY_PREFIXES) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
