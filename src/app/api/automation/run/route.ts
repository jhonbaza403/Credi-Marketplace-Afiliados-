import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
import {
  automationDedupeKey,
  isSupportedAutomationAction,
  isSupportedAutomationTrigger,
  normalizeAutomationNotification,
} from '@/lib/automation/guarded-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

type AutomationRule = {
  id: string
  name: string
  trigger_type: string
  trigger_config: unknown
  action_type: string
  action_config: unknown
  last_run_at: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const limit = await distributedRateLimit(
    supabase,
    `automation-run:${auth.user.id}:${getRequestIp(request)}`,
    { limit: 5, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  const { data: rules, error } = await supabase
    .from('business_automation_rules')
    .select('id,name,trigger_type,trigger_config,action_type,action_config,last_run_at')
    .eq('owner_id', auth.user.id)
    .eq('enabled', true)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return json({ error: 'AUTOMATION_RULES_UNAVAILABLE' }, 500)

  const admin = createAdminClient()
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('vendor_id', auth.user.id)
    .maybeSingle()

  if (storeError) return json({ error: 'AUTOMATION_CONTEXT_UNAVAILABLE' }, 500)

  const now = new Date()
  const nowIso = now.toISOString()
  let triggered = 0
  let executed = 0
  let failed = 0
  const results: Array<Record<string, unknown>> = []

  for (const rule of (rules ?? []) as AutomationRule[]) {
    if (!isSupportedAutomationTrigger(rule.trigger_type)) {
      results.push({ rule_id: rule.id, name: rule.name, status: 'skipped', reason: 'TRIGGER_NOT_SUPPORTED' })
      continue
    }

    if (!isSupportedAutomationAction(rule.action_type)) {
      const requestId = crypto.randomUUID()
      const audit = await admin.from('agent_action_audit').insert({
        owner_id: auth.user.id,
        agent_name: 'credi-automation',
        action: `automation:${rule.action_type}`,
        resource_type: 'automation_rule',
        resource_id: rule.id,
        authorization_level: 'execute',
        status: 'failed',
        request_id: requestId,
        input: { rule_id: rule.id, trigger_type: rule.trigger_type },
        output: { error: 'ACTION_NOT_SUPPORTED', message: 'La acción no tiene un ejecutor seguro conectado.' },
      })
      failed += 1
      results.push({
        rule_id: rule.id,
        name: rule.name,
        action_type: rule.action_type,
        status: 'failed',
        reason: audit.error ? 'AUDIT_WRITE_FAILED' : 'ACTION_NOT_SUPPORTED',
      })
      continue
    }

    let shouldRun = false
    let details: Record<string, unknown> = {}
    const triggerConfig = asRecord(rule.trigger_config)

    if (rule.trigger_type === 'low_stock') {
      if (!store) {
        results.push({ rule_id: rule.id, name: rule.name, status: 'skipped', reason: 'STORE_REQUIRED' })
        continue
      }
      const configured = Number(triggerConfig.threshold ?? 5)
      const threshold = Number.isInteger(configured) ? Math.min(100, Math.max(1, configured)) : 5
      const { count, error: stockError } = await admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_active', true)
        .lte('stock', threshold)
      if (stockError) {
        failed += 1
        results.push({ rule_id: rule.id, name: rule.name, status: 'failed', reason: 'STOCK_CHECK_FAILED' })
        continue
      }
      shouldRun = (count ?? 0) > 0
      details = { low_stock_count: count ?? 0, threshold }
    } else if (rule.trigger_type === 'rfq_created') {
      const since = rule.last_run_at ?? new Date(now.getTime() - 15 * 60_000).toISOString()
      const { count, error: rfqError } = await admin
        .from('business_rfqs')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', auth.user.id)
        .gte('created_at', since)
      if (rfqError) {
        failed += 1
        results.push({ rule_id: rule.id, name: rule.name, status: 'failed', reason: 'RFQ_CHECK_FAILED' })
        continue
      }
      shouldRun = (count ?? 0) > 0
      details = { recent_rfq_count: count ?? 0, since }
    } else if (rule.trigger_type === 'schedule') {
      const lastRun = rule.last_run_at ? new Date(rule.last_run_at).getTime() : 0
      shouldRun = !Number.isFinite(lastRun) || now.getTime() - lastRun >= 23 * 60 * 60_000
      details = { scheduled: true, last_run_at: rule.last_run_at }
    }

    if (!shouldRun) {
      results.push({ rule_id: rule.id, name: rule.name, status: 'not_triggered', details })
      continue
    }

    triggered += 1
    const fallbackTitle = rule.trigger_type === 'low_stock'
      ? 'Alerta de inventario bajo'
      : rule.trigger_type === 'rfq_created'
        ? 'Nueva actividad de abastecimiento'
        : 'Resumen programado de tu negocio'
    const fallbackMessage = rule.trigger_type === 'low_stock'
      ? `Hay ${String(details.low_stock_count ?? 0)} productos activos con existencias bajas.`
      : rule.trigger_type === 'rfq_created'
        ? `Se detectaron ${String(details.recent_rfq_count ?? 0)} solicitudes recientes de abastecimiento.`
        : 'Tu regla programada se ha ejecutado y requiere revisar el panel de negocio.'
    const notification = normalizeAutomationNotification(rule.action_config, {
      title: fallbackTitle,
      message: fallbackMessage,
    })
    const requestId = crypto.randomUUID()
    // Keep repeated manual runs from creating a notification storm for the same rule.
    const dedupeKey = automationDedupeKey(rule.id, rule.trigger_type, Math.floor(now.getTime() / 3_600_000))

    // Persist a proposal before the side effect. A notification is not executed
    // unless it can be recorded in the audit trail.
    const { data: audit, error: auditInsertError } = await admin
      .from('agent_action_audit')
      .insert({
        owner_id: auth.user.id,
        agent_name: 'credi-automation',
        action: 'automation:notify_owner',
        resource_type: 'automation_rule',
        resource_id: rule.id,
        authorization_level: 'execute',
        status: 'proposed',
        request_id: requestId,
        input: { rule_id: rule.id, trigger_type: rule.trigger_type },
        output: { planned_action: 'persist_in_app_notification' },
      })
      .select('id')
      .single()

    if (auditInsertError || !audit) {
      failed += 1
      results.push({ rule_id: rule.id, name: rule.name, action_type: rule.action_type, status: 'failed', reason: 'AUDIT_PREPARE_FAILED' })
      continue
    }

    const { error: notificationError } = await admin.from('notifications').insert({
      user_id: auth.user.id,
      type: rule.trigger_type === 'rfq_created' ? 'b2b' : 'system',
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      action_url: notification.actionUrl,
      entity_type: 'automation_rule',
      entity_id: rule.id,
      metadata: { rule_id: rule.id, trigger_type: rule.trigger_type, details },
      dedupe_key: dedupeKey,
    })

    const duplicate = notificationError?.code === '23505'
    if (notificationError && !duplicate) {
      await admin.from('agent_action_audit').update({
        status: 'failed',
        output: { ...details, error: 'NOTIFICATION_PERSIST_FAILED' },
      }).eq('id', audit.id).eq('owner_id', auth.user.id)
      failed += 1
      results.push({ rule_id: rule.id, name: rule.name, action_type: rule.action_type, status: 'failed', reason: 'NOTIFICATION_PERSIST_FAILED' })
      continue
    }

    const { error: ruleUpdateError } = await admin
      .from('business_automation_rules')
      .update({ last_run_at: nowIso, updated_at: nowIso })
      .eq('id', rule.id)
      .eq('owner_id', auth.user.id)

    const { error: auditUpdateError } = await admin.from('agent_action_audit')
      .update({
        status: 'executed',
        output: {
          ...details,
          notification_persisted: !duplicate,
          duplicate_suppressed: duplicate,
          rule_last_run_persisted: !ruleUpdateError,
        },
      })
      .eq('id', audit.id)
      .eq('owner_id', auth.user.id)

    if (auditUpdateError) {
      failed += 1
      results.push({ rule_id: rule.id, name: rule.name, action_type: rule.action_type, status: 'failed', reason: 'AUDIT_FINALIZE_FAILED', notification_persisted: !duplicate })
      continue
    }

    executed += 1
    results.push({
      rule_id: rule.id,
      name: rule.name,
      action_type: rule.action_type,
      status: duplicate ? 'already_notified' : 'executed',
      details,
      rule_last_run_persisted: !ruleUpdateError,
    })
  }

  return json({
    ok: failed === 0,
    evaluated: (rules ?? []).length,
    triggered,
    executed,
    failed,
    results,
  })
}
