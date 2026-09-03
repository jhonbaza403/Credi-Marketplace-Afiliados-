import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";

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

function buildLoginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (nextPath && nextPath !== "/login") {
    url.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
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
    "/dashboard/:path*",
    "/checkout/:path*",
    "/cart/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
