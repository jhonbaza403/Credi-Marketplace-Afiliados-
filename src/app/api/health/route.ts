import { createClient } from "@supabase/supabase-js"
import { apiJson, requestIdFrom } from "@/lib/api/contract"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type HealthState = "operational" | "configured" | "unconfigured" | "degraded" | "unknown"

function methodNotAllowed(request: Request) {
  const requestId = requestIdFrom(request)
  return new Response(null, {
    status: 405,
    headers: {
      Allow: "GET, HEAD",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-ID": requestId,
    },
  })
}

function configured(...values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()))
}

function providerState(...values: Array<string | undefined>): HealthState {
  return configured(...values) ? "configured" : "unconfigured"
}

export async function GET(request: Request) {
  const requestId = requestIdFrom(request)
  const timestamp = new Date().toISOString()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  let database: HealthState = "unconfigured"
  let databaseError: string | null = null

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { error } = await supabase.from("products").select("id", { count: "exact", head: true })
      if (error) {
        database = "degraded"
        databaseError = error.message
      } else {
        database = "operational"
      }
    } catch (error) {
      database = "degraded"
      databaseError = error instanceof Error ? error.message : "database_check_failed"
    }
  }

  const authentication: HealthState = configured(supabaseUrl, supabaseKey) ? "configured" : "unconfigured"
  const storage: HealthState = configured(supabaseUrl, supabaseKey) ? "configured" : "unconfigured"
  const messaging: HealthState = configured(supabaseUrl, supabaseKey) ? "configured" : "unconfigured"
  const media: HealthState = configured(supabaseUrl, supabaseKey) ? "configured" : "unconfigured"
  const payments: HealthState = providerState(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET)
  const ai: HealthState = providerState(process.env.GEMINI_API_KEY)
  const webhooks: HealthState = providerState(process.env.STRIPE_WEBHOOK_SECRET)
  const notifications: HealthState = configured(supabaseUrl, supabaseKey) ? "configured" : "unconfigured"
  const email: HealthState = "unknown"
  const backgroundJobs: HealthState = "unknown"

  const coreOperational = database === "operational" && authentication === "configured"
  const status = coreOperational ? "ok" : "degraded"

  return apiJson(
    {
      status,
      service: "credi-marketplace",
      timestamp,
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      checks: {
        database,
        authentication,
        storage,
        payments,
        ai,
        messaging,
        media,
        notifications,
        email,
        webhooks,
        background_jobs: backgroundJobs,
      },
      databaseError: process.env.NODE_ENV === "development" ? databaseError : null,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
      requestId,
    },
  )
}

export async function HEAD(request: Request) {
  const response = await GET(request)
  return new Response(null, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Request-ID": response.headers.get("X-Request-ID") ?? requestIdFrom(request),
    },
  })
}

export async function POST(request: Request) {
  return methodNotAllowed(request)
}

export async function PUT(request: Request) {
  return methodNotAllowed(request)
}
