import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSafeWebhookUrl } from '@/lib/security/webhook-url'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

const webhookSchema = z.object({
  app_id: z.string().uuid(),
  url: z.string().trim().url().max(2000),
  events: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
})

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data, error } = await supabase
    .from('developer_webhook_endpoints')
    .select('id,app_id,url,events,active,created_at,updated_at')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) return json({ error: 'WEBHOOKS_UNAVAILABLE' }, 500)
  return json({ webhooks: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  let parsed: z.infer<typeof webhookSchema>
  try {
    parsed = webhookSchema.parse(await request.json())
  } catch {
    return json({ error: 'INVALID_REQUEST' }, 400)
  }

  const safe = await isSafeWebhookUrl(parsed.url)
  if (!safe.allowed) return json({ error: safe.reason }, 400)

  const { data: app } = await supabase
    .from('developer_apps')
    .select('id')
    .eq('id', parsed.app_id)
    .eq('owner_id', auth.user.id)
    .maybeSingle()

  if (!app) return json({ error: 'APP_NOT_FOUND' }, 404)

  const secret = `whsec_${randomBytes(24).toString('base64url')}`
  const secretHash = createHash('sha256').update(secret).digest('hex')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('developer_webhook_endpoints')
    .insert({
      app_id: parsed.app_id,
      owner_id: auth.user.id,
      url: parsed.url,
      secret_hash: secretHash,
      events: [...new Set(parsed.events)],
    })
    .select('id,app_id,url,events,active,created_at')
    .single()

  if (error || !data) return json({ error: 'WEBHOOK_CREATE_FAILED' }, 500)
  return json({ ok: true, webhook: data, secret, warning: 'El secreto se muestra una sola vez.' }, 201)
}
