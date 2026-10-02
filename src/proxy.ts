import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { CANONICAL_APP_URL } from "@/lib/app-url";
import { getAccountAccessState, nextRequiredSecurityStep } from "@/lib/auth/account-access";

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/auth",
  "/pricing",
  "/legal",
  "/privacy",
  "/terms",
  "/api/billing/webhook",
  "/api/live/cloudflare-webhook",
] as const;

const SETUP_PREFIXES = [
  "/security",
  "/dashboard/compliance",
  "/api/security",
  "/api/compliance",
  "/api/agents/identity",
  "/api/billing",
] as const;

const GUEST_ONLY_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPath(pathname: string): boolean {
  return matchesPrefix(pathname, PUBLIC_PREFIXES);
}

function isSetupPath(pathname: string): boolean {
  return matchesPrefix(pathname, SETUP_PREFIXES);
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

function buildSecurityRedirect(request: NextRequest, step: "mfa" | "security-key"): NextResponse {
  const url = new URL("/security", request.url);
  url.searchParams.set("required", step);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== "/security") url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

function buildRequiredRedirect(request: NextRequest, path: "/pricing" | "/dashboard/compliance", required: string): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set("required", required);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== path) url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-Request-ID", requestId);

  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) {
    canonicalRedirect.headers.set("X-Request-ID", requestId);
    return canonicalRedirect;
  }

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const isSetup = isSetupPath(pathname);
  const requiresAuth = !isPublic;
  const requiresPlatformAccess = !isPublic && !isSetup;
  const guestOnly = matchesPrefix(pathname, GUEST_ONLY_PREFIXES);

  if (!requiresAuth) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    response.headers.set("X-Request-ID", requestId);
    return buildLoginRedirect(request);
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      response.headers.set("X-Request-ID", requestId);
      return buildLoginRedirect(request);
    }

    if (guestOnly) {
      const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
      redirect.headers.set("X-Request-ID", requestId);
      return redirect;
    }

    if (!requiresPlatformAccess) {
      response.headers.set("X-Request-ID", requestId);
      return response;
    }

    const access = await getAccountAccessState(supabase, user.id);
    const required = nextRequiredSecurityStep(access);

    if (required === "mfa" || required === "security-key") {
      const redirect = buildSecurityRedirect(request, required);
      redirect.headers.set("X-Request-ID", requestId);
      return redirect;
    }

    if (required === "subscription") {
      const redirect = buildRequiredRedirect(request, "/pricing", "subscription");
      redirect.headers.set("X-Request-ID", requestId);
      return redirect;
    }

    if (required === "identity") {
      const redirect = buildRequiredRedirect(request, "/dashboard/compliance", "identity");
      redirect.headers.set("X-Request-ID", requestId);
      return redirect;
    }

    response.headers.set("X-Request-ID", requestId);
    return response;
  } catch (error) {
    console.error("[proxy] Access check failed", error);
    response.headers.set("X-Request-ID", requestId);
    return buildSecurityRedirect(request, "mfa");
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
