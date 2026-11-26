export type AutomationPriority = 'normal' | 'high'

export interface AutomationNotificationConfig {
  title: string
  message: string
  actionUrl: string | null
  priority: AutomationPriority
}

export function isSupportedAutomationTrigger(value: string): boolean {
  return value === 'low_stock' || value === 'rfq_created' || value === 'schedule'
}

export function isSupportedAutomationAction(value: string): boolean {
  // The current runtime supports a real, persisted in-app notification only.
  // Arbitrary code, external HTTP calls, money movement and stock changes are
  // deliberately not executable from user-authored automation rules.
  return value === 'notify_owner'
}

export function isSafeInternalActionUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate || candidate.length > 255) return null
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return null
  return candidate
}

export function normalizeAutomationNotification(
  config: unknown,
  fallback: { title: string; message: string },
): AutomationNotificationConfig {
  const values = config && typeof config === 'object' && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {}

  const configuredTitle = typeof values.title === 'string' ? values.title.trim() : ''
  const configuredMessage = typeof values.message === 'string' ? values.message.trim() : ''
  const priority = values.priority === 'high' ? 'high' : 'normal'

  return {
    title: (configuredTitle || fallback.title).slice(0, 140),
    message: (configuredMessage || fallback.message).slice(0, 1000),
    actionUrl: isSafeInternalActionUrl(values.action_url),
    priority,
  }
}

export function automationDedupeKey(ruleId: string, triggerType: string, bucket: number): string {
  return `automation:${ruleId}:${triggerType}:${bucket}`
}
