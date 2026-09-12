import 'server-only'

import { createPrivateKey, sign } from 'node:crypto'

const COINBASE_BUSINESS_API = 'https://business.coinbase.com/api/v1'

type CoinbaseCheckout = {
  id: string
  url: string
  amount: string
  currency: string
  network: 'base'
  address: string
  tokenAddress?: string
  description?: string
  metadata?: Record<string, string>
  expiresAt?: string
  successRedirectUrl?: string
  failRedirectUrl?: string
  status: 'ACTIVE' | 'PROCESSING' | 'DEACTIVATED' | 'EXPIRED' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  settlement?: { totalAmount: string; feeAmount: string; netAmount: string; currency: string }
  transactionHash?: string
  refundedAmount?: string
  createdAt: string
  updatedAt: string
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`COINBASE_CONFIG_MISSING:${name}`)
  return value
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url')
}

function generateJwt(method: string, path: string) {
  const keyName = requiredEnv('COINBASE_BUSINESS_API_KEY_NAME')
  const privateKeyPem = requiredEnv('COINBASE_BUSINESS_API_KEY_SECRET').replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = {
    typ: 'JWT',
    alg: 'ES256',
    kid: keyName,
    nonce: Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
  }
  const payload = {
    iss: 'cdp',
    nbf: now,
    exp: now + 120,
    sub: keyName,
    uri: `${method.toUpperCase()} business.coinbase.com${path}`,
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: createPrivateKey(privateKeyPem),
    dsaEncoding: 'ieee-p1363',
  })
  return `${signingInput}.${signature.toString('base64url')}`
}

async function coinbaseRequest<T>(method: 'GET' | 'POST', path: string, init: RequestInit = {}) {
  const token = generateJwt(method, path)
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')
  const response = await fetch(`${COINBASE_BUSINESS_API}${path}`, {
    ...init,
    method,
    headers,
    cache: 'no-store',
  })
  const text = await response.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  if (!response.ok) {
    const error = new Error(`COINBASE_HTTP_${response.status}`)
    ;(error as Error & { details?: unknown }).details = data
    throw error
  }
  return data as T
}

export async function createCoinbaseCheckout(input: {
  amount: number
  currency: 'USDC'
  orderId: string
  customerId: string
  successRedirectUrl: string
  failRedirectUrl: string
  idempotencyKey: string
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('COINBASE_INVALID_AMOUNT')
  const amount = input.amount.toFixed(2)
  const metadata = {
    orderId: input.orderId,
    customerId: input.customerId,
    source: 'credi-marketplace',
  }

  return coinbaseRequest<CoinbaseCheckout>('POST', '/checkouts', {
    headers: { 'X-Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      amount,
      currency: input.currency,
      description: `Credi Marketplace order ${input.orderId}`.slice(0, 500),
      metadata,
      successRedirectUrl: input.successRedirectUrl,
      failRedirectUrl: input.failRedirectUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  })
}

export async function getCoinbaseCheckout(checkoutId: string) {
  return coinbaseRequest<CoinbaseCheckout>('GET', `/checkouts/${encodeURIComponent(checkoutId)}`)
}
