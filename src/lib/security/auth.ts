import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/user";

export type AuthenticatedContext = {
  user: User;
  role: UserRole | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function getAuthenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, role: null as UserRole | null, error: error ?? null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return { supabase, user: data.user, role: (profile?.role as UserRole | null) ?? null, error: null };
}

export async function requireAuthenticatedUser() {
  const ctx = await getAuthenticatedContext();
  if (!ctx.user) {
    return { ok: false as const, response: NextResponse.json({ success:false, error:"Debes iniciar sesión.", code:"UNAUTHENTICATED" }, { status:401, headers:{"Cache-Control":"no-store"} }), ...ctx };
  }
  return { ok: true as const, ...ctx };
}

export async function requireRole(allowed: readonly UserRole[]) {
  const ctx = await requireAuthenticatedUser();
  if (!ctx.ok) return ctx;
  if (!ctx.role || !allowed.includes(ctx.role)) {
    return { ok:false as const, response:NextResponse.json({success:false,error:"Acceso denegado.",code:"FORBIDDEN"},{status:403,headers:{"Cache-Control":"no-store"}}), supabase:ctx.supabase, user:ctx.user, role:ctx.role, error:ctx.error };
  }
  return ctx;
}

export function assertOwnership(ownerId: string | null | undefined, userId: string) {
  return Boolean(ownerId && userId && ownerId === userId);
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded?.split(",")[0]?.trim() || real?.trim() || "unknown").slice(0,128);
}
