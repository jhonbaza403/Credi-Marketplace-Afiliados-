import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export type AgentApprovalClaims = {
  requestId: string
  ownerId: string
  action: string
  resourceId: string | null
  inputHash: string
  expiresAt: number
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    )
  }
  return value
}

/** Hashes the exact user-reviewed operation input, ignoring only approval transport fields. */
export function hashAgentApprovalInput(body: Record<string, unknown>): string {
  const excluded = new Set(['approved', 'approval_token', 'request_id'])
  const input = Object.fromEntries(Object.entries(body).filter(([key]) => !excluded.has(key)))
  return createHash('sha256').update(JSON.stringify(canonicalize(input))).digest('hex')
}

export function signAgentApprovalToken(claims: AgentApprovalClaims, secret: string): string {
  if (!secret.trim()) throw new Error('AGENT_APPROVAL_SECRET_NOT_CONFIGURED')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyAgentApprovalToken(
  token: string,
  expected: Omit<AgentApprovalClaims, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): boolean {
  if (!secret.trim()) return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra !== undefined) return false

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url')
  const received = Buffer.from(signature)
  const calculated = Buffer.from(expectedSignature)
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) return false

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AgentApprovalClaims
    return parsed.requestId === expected.requestId &&
      parsed.ownerId === expected.ownerId &&
      parsed.action === expected.action &&
      (parsed.resourceId ?? null) === (expected.resourceId ?? null) &&
      parsed.inputHash === expected.inputHash &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > now
  } catch {
    return false
  }
}
