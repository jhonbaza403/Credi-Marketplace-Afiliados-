import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const timestamp = new Date().toISOString()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  let database = "unconfigured"
  let databaseError: string | null = null

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { error } = await supabase.from("products").select("id", { count: "exact", head: true })
      if (error) {
        database = "degraded"
        databaseError = error.message
      } else {
        database = "ok"
      }
    } catch (error) {
      database = "degraded"
      databaseError = error instanceof Error ? error.message : "database_check_failed"
    }
  }

  const status = database === "ok" ? "ok" : "degraded"

  return NextResponse.json(
    {
      status,
      service: "credi-marketplace",
      timestamp,
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      database,
      databaseError: process.env.NODE_ENV === "development" ? databaseError : null,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
    },
  )
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } })
}
