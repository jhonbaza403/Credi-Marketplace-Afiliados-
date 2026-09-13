import { describe, expect, it } from 'vitest'
import { createPkceS256Challenge, verifyPkceS256 } from '@/lib/oauth/pkce'
import { buildSearchOrFilter, sanitizeSearchQuery } from '@/lib/search/postgrest-filter'
import { isBlockedWebhookIp } from '@/lib/security/webhook-url'

describe('security hardening', () => {
  it('implements RFC 7636 S256 correctly', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = createPkceS256Challenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    expect(verifyPkceS256(verifier, challenge)).toBe(true)
    expect(verifyPkceS256(`${verifier}x`, challenge)).toBe(false)
  })

  it('removes PostgREST grammar and LIKE metacharacters from free-text search', () => {
    const query = sanitizeSearchQuery('  phone,(or),description.%_\\  ')
    expect(query).toBe('phone or description')
    expect(buildSearchOrFilter(['title', 'description'], 'phone,(or)')).toBe('title.ilike.%phone or or%,description.ilike.%phone or or%')
    expect(buildSearchOrFilter(['title;drop', 'description'], 'x')).toBe('description.ilike.%x%')
  })

  it('blocks private, link-local, benchmark, and metadata-service webhook destinations', () => {
    expect(isBlockedWebhookIp('127.0.0.1')).toBe('LOOPBACK')
    expect(isBlockedWebhookIp('169.254.169.254')).toBe('LINK_LOCAL')
    expect(isBlockedWebhookIp('10.0.0.1')).toBe('PRIVATE_NETWORK')
    expect(isBlockedWebhookIp('192.168.1.1')).toBe('PRIVATE_NETWORK')
    expect(isBlockedWebhookIp('100.64.1.1')).toBe('SHARED_ADDRESS_SPACE')
    expect(isBlockedWebhookIp('198.18.1.1')).toBe('BENCHMARK_NETWORK')
    expect(isBlockedWebhookIp('224.0.0.1')).toBe('MULTICAST')
    expect(isBlockedWebhookIp('8.8.8.8')).toBe(null)
  })
})
