import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPPORTED_ACTIONS = new Set(['notify_owner', 'create_notification', 'notification'])
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })

type Rule = {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown> | null
  action_type: string
  action_config: Record<string, unknown> | null
  enabled: boolean
  last_run_at: string | null
}

type TriggerResult = {
  shouldRun: boolean
  details: Record<string, unknown>
  reason?: string
}

function configuredText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : fallback
}

async function evaluateTrigger(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rule: Rule,
  userId: string,
  storeId: string | null,
): Promise<TriggerResult> {
  if (rule.trigger_type === 'low_stock') {
    if (!storeId) return { shouldRun: false, details: {}, reason: 'store_not_found' }

    const config = rule.trigger_config ?? {}
    const rawThreshold = Number(config.threshold ?? 20)
    const threshold = Number.isFinite(rawThreshold) ? Math.max(0, Math.min(100_000, Math.floor(rawThreshold))) : 20
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('is_active', true)
      .lte('stock', threshold)

    if (error) throw new Error('LOW_STOCK_TRIGGER_UNAVAILABLE')
    const lowStockCount = count ?? 0
    return {
      shouldRun: lowStockCount > 0,
      details: { low_stock_count: lowStockCount, threshold, includes_out_of_stock: true },
      reason: lowStockCount > 0 ? undefined : 'trigger_not_met',
    }
  }

  if (rule.trigger_type === 'rfq_created') {
    const since = new Date(Date.now() - 15 * 60_000).toISOString()
    const { count, error } = await supabase
      .from('business_rfqs')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .gte('created_at', since)

    if (error) throw new Error('RFQ_TRIGGER_UNAVAILABLE')
    const recentRfqCount = count ?? 0
    return {
      shouldRun: recentRfqCount > 0,
      details: { recent_rfq_count: recentRfqCount, window_minutes: 15 },
      reason: recentRfqCount > 0 ? undefined : 'trigger_not_met',
    }
  }

  if (rule.trigger_type === 'schedule') {
    const lastRun = rule.last_run_at ? new Date(rule.last_run_at).getTime() : 0
    const shouldRun = !Number.isFinite(lastRun) || lastRun <= Date.now() - 23 * 60 * 60_000
    return {
      shouldRun,
      details: { schedule_window_hours: 23 },
      reason: shouldRun ? undefined : 'schedule_not_due',
    }
  }

  return { shouldRun: false, details: {}, reason: 'unsupported_trigger' }
}

function notificationForRule(rule: Rule, userId: string, details: Record<string, unknown>) {
  const config = rule.action_config ?? {}
  const lowStock = rule.trigger_type === 'low_stock'
  const rfqCreated = rule.trigger_type === 'rfq_created'
  const title = configuredText(
    config.title,
    lowStock ? 'Inventario por revisar' : rfqCreated ? 'Nueva solicitud B2B' : 'Automatización Credi',
    200,
  )
  const fallbackMessage = lowStock
    ? `Hay ${String(details.low_stock_count ?? 0)} productos con inventario bajo en tu tienda.`
    : rfqCreated
      ? `Se detectaron ${String(details.recent_rfq_count ?? 0)} solicitudes B2B recientes asociadas a tu cuenta.`
      : `La regla “${rule.name}” alcanzó su condición programada.`
  const message = configuredText(config.message, fallbackMessage, 4000)
  const actionUrl = lowStock ? '/business-os' : rfqCreated ? '/b2b' : '/automation'
  const now = new Date()
  const dayKey = now.toISOString().slice(0, 10)
  const windowKey = rfqCreated ? Math.floor(now.getTime() / (15 * 60_000)).toString() : dayKey

  return {
    user_id: userId,
    type: 'system' as const,
    priority: lowStock ? 'high' as const : 'normal' as const,
    title,
    message,
    action_url: actionUrl,
    entity_type: 'automation_rule',
    entity_id: rule.id,
    metadata: { module: 'CREDI-AUTOMATION', rule_id: rule.id, trigger_type: rule.trigger_type, details },
    dedupe_key: `credi-automation:${rule.id}:${rule.trigger_type}:${windowKey}`,
  }
}

async function writeAudit(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    ownerId: string
    rule: Rule
    status: 'executed' | 'failed' | 'rejected'
    requestId: string
    triggerDetails: Record<string, unknown>
    output?: Record<string, unknown>
    errorCode?: string
  },
) {
  const { error } = await admin.from('agent_action_audit').insert({
    owner_id: input.ownerId,
    agent_name: 'CREDI-AUTOMATION',
    action: `automation:${input.rule.action_type}`,
    resource_type: 'automation_rule',
    resource_id: input.rule.id,
    authorization_level: input.status === 'executed' ? 'execute' : 'proposed',
    status: input.status,
    request_id: input.requestId,
    input: { rule_id: input.rule.id, trigger_type: input.rule.trigger_type },
    output: { trigger_details: input.triggerDetails, ...(input.output ?? {}), ...(input.errorCode ? { error_code: input.errorCode } : {}) },
  })
  if (error) throw new Error('AUTOMATION_AUDIT_WRITE_FAILED')
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ success: false, error: 'Origen no autorizado.', code: 'CSRF_VALIDATION_FAILED' }, 403)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ success: false, error: 'Debes iniciar sesión.', code: 'UNAUTHORIZED' }, 401)

  const rateLimit = await distributedRateLimit(
    supabase,
    `automation:${user.id}:${getRequestIp(request)}`,
    { limit: 6, windowMs: 60_000 },
  )
  if (!rateLimit.success) return json({ success: false, error: 'Has ejecutado demasiadas solicitudes. Inténtalo en un minuto.', code: 'RATE_LIMITED' }, 429)

  const requestId = crypto.randomUUID()
  const { data: rules, error: rulesError } = await supabase
    .from('business_automation_rules')
    .select('id,name,trigger_type,trigger_config,action_type,action_config,enabled,last_run_at')
    .eq('owner_id', user.id)
    .eq('enabled', true)
    .limit(100)

  if (rulesError) return json({ success: false, error: 'No fue posible cargar las reglas activas.', code: 'AUTOMATION_RULES_UNAVAILABLE' }, 500)

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('vendor_id', user.id)
    .maybeSingle()

  if (storeError) return json({ success: false, error: 'No fue posible cargar la tienda de la cuenta.', code: 'AUTOMATION_STORE_UNAVAILABLE' }, 500)

  const admin = createAdminClient()
  const results: Array<Record<string, unknown>> = []
  let executed = 0
  let skipped = 0
  let failed = 0

  for (const rawRule of rules ?? []) {
    const rule = rawRule as Rule
    let trigger: TriggerResult

    try {
      trigger = await evaluateTrigger(supabase, rule, user.id, store?.id ?? null)
    } catch (error) {
      failed += 1
      try {
        await writeAudit(admin, {
          ownerId: user.id,
          rule,
          status: 'failed',
          requestId,
          triggerDetails: {},
          errorCode: error instanceof Error ? error.message : 'TRIGGER_EVALUATION_FAILED',
        })
      } catch (auditError) {
        console.error('[CREDI-AUTOMATION] No fue posible registrar fallo de evaluación', auditError)
      }
      results.push({ rule_id: rule.id, name: rule.name, status: 'failed', reason: 'trigger_evaluation_failed' })
      continue
    }

    if (!trigger.shouldRun) {
      skipped += 1
      results.push({ rule_id: rule.id, name: rule.name, status: 'skipped', reason: trigger.reason ?? 'trigger_not_met', details: trigger.details })
      continue
    }

    if (!SUPPORTED_ACTIONS.has(rule.action_type)) {
      skipped += 1
      try {
        await writeAudit(admin, {
          ownerId: user.id,
          rule,
          status: 'rejected',
          requestId,
          triggerDetails: trigger.details,
          errorCode: 'UNSUPPORTED_AUTOMATION_ACTION',
          output: { supported_actions: [...SUPPORTED_ACTIONS] },
        })
      } catch (auditError) {
        console.error('[CREDI-AUTOMATION] No fue posible registrar acción no compatible', auditError)
      }
      results.push({ rule_id: rule.id, name: rule.name, status: 'skipped', reason: 'unsupported_action', action_type: rule.action_type })
      continue
    }

    try {
      const notification = notificationForRule(rule, user.id, trigger.details)
      const { data: inserted, error: notificationError } = await admin
        .from('notifications')
        .upsert(notification, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
        .select('id')
        .maybeSingle()

      if (notificationError) throw new Error('AUTOMATION_NOTIFICATION_FAILED')

      const completedAt = new Date().toISOString()
      const { error: updateError } = await admin
        .from('business_automation_rules')
        .update({ last_run_at: completedAt })
        .eq('id', rule.id)
        .eq('owner_id', user.id)

      if (updateError) throw new Error('AUTOMATION_RULE_UPDATE_FAILED')

      await writeAudit(admin, {
        ownerId: user.id,
        rule,
        status: 'executed',
        requestId,
        triggerDetails: trigger.details,
        output: { notification_id: inserted?.id ?? null, deduplicated: !inserted, completed_at: completedAt },
      })

      executed += 1
      results.push({
        rule_id: rule.id,
        name: rule.name,
        status: 'executed',
        action_type: rule.action_type,
        notification_id: inserted?.id ?? null,
        deduplicated: !inserted,
      })
    } catch (error) {
      failed += 1
      try {
        await writeAudit(admin, {
          ownerId: user.id,
          rule,
          status: 'failed',
          requestId,
          triggerDetails: trigger.details,
          errorCode: error instanceof Error ? error.message : 'AUTOMATION_ACTION_FAILED',
        })
      } catch (auditError) {
        console.error('[CREDI-AUTOMATION] No fue posible registrar fallo de ejecución', auditError)
      }
      results.push({ rule_id: rule.id, name: rule.name, status: 'failed', reason: 'action_failed' })
    }
  }

  return json({
    ok: failed === 0,
    request_id: requestId,
    evaluated: (rules ?? []).length,
    executed,
    skipped,
    failed,
    results,
  })
}
