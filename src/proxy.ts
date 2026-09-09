import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { CANONICAL_APP_URL } from "@/lib/app-url";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/checkout",
  "/cart",
  "/admin",
  "/publish",
  "/products/create",
] as const;

const GUEST_ONLY_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const requestHost = request.nextUrl.hostname.toLowerCase();
  const canonicalHost = new URL(CANONICAL_APP_URL).hostname.toLowerCase();
  if (isDevelopmentHost(requestHost) || requestHost === canonicalHost) return null;

  const canonicalUrl = new URL(CANONICAL_APP_URL);
  canonicalUrl.pathname = request.nextUrl.pathname;
  canonicalUrl.search = request.nextUrl.search;
  return NextResponse.redirect(canonicalUrl, 308);
}

function buildLoginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== "/login") url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  const { pathname } = request.nextUrl;
  const requiresAuth = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const guestOnly = matchesPrefix(pathname, GUEST_ONLY_PREFIXES);

  if (!requiresAuth && !guestOnly) return NextResponse.next();

  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return requiresAuth ? buildLoginRedirect(request) : response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (requiresAuth && !user) return buildLoginRedirect(request);
    if (guestOnly && user) return NextResponse.redirect(new URL("/dashboard", request.url));
    return response;
  } catch (error) {
    console.error("[proxy] Session check failed", error);
    return requiresAuth ? buildLoginRedirect(request) : response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
