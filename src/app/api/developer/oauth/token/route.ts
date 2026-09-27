import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { corsHeaders, corsPreflight } from '@/lib/security/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200, request?: Request) => {
  const headers = corsHeaders(request ?? new Request('http://localhost'))
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  return NextResponse.json(data, { status, headers })
}
const hash = (v: string) => createHash('sha256').update(v).digest('hex')

export function OPTIONS(request: Request) { return corsPreflight(request) }

export async function POST(request: Request) {
  const admin = createAdminClient()
  const limit = await distributedRateLimit(admin, `oauth-token:${getRequestIp(request)}`, { limit: 30, windowMs: 60_000 })
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429, request)

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/x-www-form-urlencoded') && !contentType.toLowerCase().includes('application/json')) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415, request)
  }

  const raw = await request.text()
  if (raw.length > 32_768) return json({ error: 'REQUEST_TOO_LARGE' }, 413, request)

  let b: Record<string, unknown>
  try {
    b = contentType.toLowerCase().includes('application/json')
      ? JSON.parse(raw) as Record<string, unknown>
      : Object.fromEntries(new URLSearchParams(raw).entries())
  } catch {
    return json({ error: 'INVALID_REQUEST' }, 400, request)
  }

  const grant = String(b.grant_type ?? '')
  const clientId = String(b.client_id ?? '')
  if (!clientId || clientId.length > 200) return json({ error: 'INVALID_CLIENT' }, 400, request)

  if (grant === 'refresh_token') {
    const refresh = String(b.refresh_token ?? '')
    if (!refresh || refresh.length > 512) return json({ error: 'INVALID_REFRESH_REQUEST' }, 400, request)
    const refreshHash = hash(refresh)
    const { data: row } = await admin.from('developer_oauth_authorizations')
      .select('id,app_id,user_id,scopes,refresh_token_expires_at,revoked_at')
      .eq('app_id', clientId).eq('refresh_token_hash', refreshHash).maybeSingle()
    if (!row || row.revoked_at) return json({ error: 'INVALID_REFRESH_TOKEN' }, 400, request)
    if (row.refresh_token_expires_at && new Date(row.refresh_token_expires_at).getTime() <= Date.now()) return json({ error: 'REFRESH_TOKEN_EXPIRED' }, 400, request)

    const access = `cat_${randomBytes(32).toString('base64url')}`
    const newRefresh = `crt_${randomBytes(40).toString('base64url')}`
    const now = new Date()
    const { data: rotated, error } = await admin.from('developer_oauth_authorizations')
      .update({
        access_token_hash: hash(access),
        refresh_token_hash: hash(newRefresh),
        access_token_expires_at: new Date(now.getTime() + 60 * 60000).toISOString(),
        refresh_token_expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
      })
      .eq('id', row.id).eq('refresh_token_hash', refreshHash).is('revoked_at', null)
      .select('id').maybeSingle()
    if (error || !rotated) return json({ error: 'INVALID_REFRESH_TOKEN' }, 400, request)
    return json({ access_token: access, token_type: 'Bearer', expires_in: 3600, scope: row.scopes.join(' '), refresh_token: newRefresh }, 200, request)
  }

  const code = String(b.code ?? '')
  const redirectUri = String(b.redirect_uri ?? '')
  const verifier = String(b.code_verifier ?? '')
  if (grant !== 'authorization_code' || !code || !redirectUri || !verifier || redirectUri.length > 2048 || verifier.length > 256) {
    return json({ error: 'INVALID_GRANT_REQUEST' }, 400, request)
  }

  const codeHash = hash(code)
  const { data: row } = await admin.from('developer_oauth_authorizations')
    .select('id,app_id,user_id,scopes,authorization_code_expires_at,redirect_uri,code_challenge,code_challenge_method,used_at')
    .eq('app_id', clientId).eq('authorization_code_hash', codeHash).maybeSingle()
  if (!row || row.used_at) return json({ error: 'INVALID_AUTHORIZATION_CODE' }, 400, request)
  if (row.authorization_code_expires_at && new Date(row.authorization_code_expires_at).getTime() <= Date.now()) return json({ error: 'AUTHORIZATION_CODE_EXPIRED' }, 400, request)
  if (row.redirect_uri !== redirectUri || row.code_challenge_method !== 'S256' || !row.code_challenge) return json({ error: 'PKCE_MISMATCH' }, 400, request)
  if (hash(verifier) !== Buffer.from(row.code_challenge, 'base64url').toString('hex')) return json({ error: 'PKCE_VERIFIER_INVALID' }, 400, request)

  const access = `cat_${randomBytes(32).toString('base64url')}`
  const refresh = `crt_${randomBytes(40).toString('base64url')}`
  const now = new Date()
  const { data: issued, error } = await admin.from('developer_oauth_authorizations')
    .update({
      access_token_hash: hash(access),
      refresh_token_hash: hash(refresh),
      access_token_expires_at: new Date(now.getTime() + 60 * 60000).toISOString(),
      refresh_token_expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
      used_at: now.toISOString(),
      authorization_code_hash: null,
    })
    .eq('id', row.id).eq('authorization_code_hash', codeHash).is('used_at', null)
    .select('id').maybeSingle()
  if (error || !issued) return json({ error: 'INVALID_AUTHORIZATION_CODE' }, 400, request)

  return json({ access_token: access, token_type: 'Bearer', expires_in: 3600, scope: row.scopes.join(' '), refresh_token: refresh }, 200, request)
}
