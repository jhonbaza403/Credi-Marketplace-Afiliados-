import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function methodNotAllowed(request: Request) {
  return new Response(null, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Request-ID": request.headers.get("x-request-id") ?? crypto.randomUUID() } });
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { data, error } = await supabase.rpc("get_b2b_access_context", { p_user_id: auth.user.id });
  if (error || !data) return NextResponse.json({ error: "B2B_ACCESS_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) { return methodNotAllowed(request) }
