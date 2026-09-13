import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

const PRIVATE_IPV4_RANGES = [
  [/^10\./, 'PRIVATE_NETWORK'],
  [/^127\./, 'LOOPBACK'],
  [/^169\.254\./, 'LINK_LOCAL'],
  [/^192\.168\./, 'PRIVATE_NETWORK'],
  [/^172\.(1[6-9]|2\d|3[0-1])\./, 'PRIVATE_NETWORK'],
  [/^0\./, 'UNSPECIFIED'],
] as const

export function isBlockedWebhookIp(address: string): string | null {
  if (isIP(address) === 4) {
    for (const [pattern, reason] of PRIVATE_IPV4_RANGES) {
      if (pattern.test(address)) return reason
    }
    return null
  }

  const normalized = address.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (normalized === '::1') return 'LOOPBACK'
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return 'UNSPECIFIED'
  if (normalized.startsWith('fe80:')) return 'LINK_LOCAL'
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return 'PRIVATE_NETWORK'
  if (normalized.startsWith('::ffff:')) return isBlockedWebhookIp(normalized.slice(7))
  return null
}

export async function isSafeWebhookUrl(rawUrl: string): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { allowed: false, reason: 'INVALID_WEBHOOK_URL' }
  }

  if (url.protocol !== 'https:') return { allowed: false, reason: 'HTTPS_REQUIRED' }
  if (url.username || url.password) return { allowed: false, reason: 'WEBHOOK_CREDENTIALS_NOT_ALLOWED' }
  if (!url.hostname || url.hostname.length > 253) return { allowed: false, reason: 'INVALID_WEBHOOK_HOST' }

  const literalReason = isBlockedWebhookIp(url.hostname)
  if (literalReason) return { allowed: false, reason: `WEBHOOK_HOST_BLOCKED:${literalReason}` }

  try {
    const records = await lookup(url.hostname, { all: true, verbatim: true })
    if (!records.length) return { allowed: false, reason: 'WEBHOOK_DNS_NOT_RESOLVED' }
    for (const record of records) {
      const reason = isBlockedWebhookIp(record.address)
      if (reason) return { allowed: false, reason: `WEBHOOK_ADDRESS_BLOCKED:${reason}` }
    }
  } catch {
    return { allowed: false, reason: 'WEBHOOK_DNS_LOOKUP_FAILED' }
  }

  return { allowed: true }
}
