import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

function ipv4ToInt(address: string): number | null {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0
}

function inIpv4Cidr(address: string, network: string, prefix: number): boolean {
  const ip = ipv4ToInt(address)
  const base = ipv4ToInt(network)
  if (ip === null || base === null || prefix < 0 || prefix > 32) return false
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ip & mask) === (base & mask)
}

const PRIVATE_IPV4_RANGES: ReadonlyArray<readonly [string, number, string]> = [
  ['0.0.0.0', 8, 'UNSPECIFIED'],
  ['10.0.0.0', 8, 'PRIVATE_NETWORK'],
  ['100.64.0.0', 10, 'SHARED_ADDRESS_SPACE'],
  ['127.0.0.0', 8, 'LOOPBACK'],
  ['169.254.0.0', 16, 'LINK_LOCAL'],
  ['172.16.0.0', 12, 'PRIVATE_NETWORK'],
  ['192.0.0.0', 24, 'SPECIAL_USE'],
  ['192.0.2.0', 24, 'DOCUMENTATION'],
  ['192.168.0.0', 16, 'PRIVATE_NETWORK'],
  ['198.18.0.0', 15, 'BENCHMARK_NETWORK'],
  ['198.51.100.0', 24, 'DOCUMENTATION'],
  ['203.0.113.0', 24, 'DOCUMENTATION'],
  ['224.0.0.0', 4, 'MULTICAST'],
  ['240.0.0.0', 4, 'RESERVED'],
]

export function isBlockedWebhookIp(address: string): string | null {
  if (isIP(address) === 4) {
    for (const [network, prefix, reason] of PRIVATE_IPV4_RANGES) {
      if (inIpv4Cidr(address, network, prefix)) return reason
    }
    return null
  }

  const normalized = address.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (normalized === '::1') return 'LOOPBACK'
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return 'UNSPECIFIED'
  if (normalized.startsWith('fe80:')) return 'LINK_LOCAL'
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return 'PRIVATE_NETWORK'
  if (normalized.startsWith('ff')) return 'MULTICAST'
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
