import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'order.created'
  | 'order.cancelled'
  | 'payment.created'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.webhook'
  | 'affiliate.clicked'
  | 'auth.login'
  | 'auth.logout'
  | 'security.rate_limited'

export interface AuditEvent {
  action: AuditAction
  userId?: string | null
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditEvent(
  event: AuditEvent,
): Promise<void> {
  try {
    const supabase =
      await createClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: event.action,
        user_id: event.userId ?? null,
        entity_type:
          event.entityType ?? null,
        entity_id:
          event.entityId ?? null,
        metadata: event.metadata ?? {},
      })

    if (error) {
      console.error(
        '[audit] Failed to write audit event:',
        error,
      )
    }
  } catch (error) {
    console.error(
      '[audit] Unexpected error:',
      error,
    )
  }
}
