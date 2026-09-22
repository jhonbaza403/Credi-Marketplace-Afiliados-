import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type Permission } from "./permissions";
import { isValidRole, type UserRole } from "./roles";
export type AuthContext = { user: User; role: UserRole };
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isValidRole(profile.role)) redirect("/login");
  return { user, role: profile.role };
}
export function requireRole(context: AuthContext, role: UserRole): AuthContext {
  if (context.role !== role) redirect("/");
  return context;
}
export function requirePermission(context: AuthContext, permission: Permission): AuthContext {
  if (!hasPermission(context.role, permission)) redirect("/");
  return context;
}
export async function requireApiUser(supabase: SupabaseClient): Promise<AuthContext> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isValidRole(profile.role)) throw new Response("Forbidden", { status: 403 });
  return { user, role: profile.role };
}