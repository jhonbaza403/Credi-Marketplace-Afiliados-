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
  // "configured" means credentials exist; only the database probe above is
  // actively exercised here. Unknown is deliberately not presented as healthy.
  const storage: HealthState = "unknown"
  const messaging: HealthState = providerState(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const media: HealthState = "unknown"
  const payments: HealthState = providerState(process.env.STRIPE_SECRET_KEY)
  const ai: HealthState = process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
    ? "configured"
    : "unconfigured"
  const stripePaymentsWebhook: HealthState = providerState(process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET)
  const stripeBillingWebhook: HealthState = providerState(process.env.STRIPE_BILLING_WEBHOOK_SECRET)
  const cloudflareWebhook: HealthState = providerState(process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET)
  const cloudflareStream: HealthState = providerState(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN)
  const livekit: HealthState = providerState(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)
  const webhooks: HealthState = [stripePaymentsWebhook, stripeBillingWebhook, cloudflareWebhook].every((state) => state === "configured")
    ? "configured"
    : "unconfigured"
  const notifications: HealthState = "unknown"
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
        stripe_payments_webhook: stripePaymentsWebhook,
        stripe_billing_webhook: stripeBillingWebhook,
        cloudflare_stream_webhook: cloudflareWebhook,
        cloudflare_stream: cloudflareStream,
        livekit,
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
