import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPkceS256 } from '@/lib/oauth/pkce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

const bodySchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  client_id: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(1000).optional(),
  redirect_uri: z.string().url().max(2000).optional(),
  code_verifier: z.string().min(43).max(128).optional(),
  refresh_token: z.string().min(1).max(1000).optional(),
})

const hashHex = (value: string) => createHash('sha256').update(value).digest('hex')

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return json({ error: 'INVALID_REQUEST' }, 400)
  }

  const admin = createAdminClient()

  if (parsed.grant_type === 'refresh_token') {
    const refresh = parsed.refresh_token
    if (!refresh) return json({ error: 'INVALID_REFRESH_REQUEST' }, 400)
    const refreshHash = hashHex(refresh)

    const { data: row, error: lookupError } = await admin
      .from('developer_oauth_authorizations')
      .select('id,scopes,refresh_token_expires_at,revoked_at')
      .eq('app_id', parsed.client_id)
      .eq('refresh_token_hash', refreshHash)
      .maybeSingle()

    if (lookupError || !row || row.revoked_at) return json({ error: 'INVALID_REFRESH_TOKEN' }, 400)
    if (row.refresh_token_expires_at && new Date(row.refresh_token_expires_at).getTime() <= Date.now()) {
      return json({ error: 'REFRESH_TOKEN_EXPIRED' }, 400)
    }

    const access = `cat_${randomBytes(32).toString('base64url')}`
    const newRefresh = `crt_${randomBytes(40).toString('base64url')}`
    const now = new Date()
    const accessExp = new Date(now.getTime() + 60 * 60 * 1000)
    const refreshExp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error } = await admin
      .from('developer_oauth_authorizations')
      .update({
        access_token_hash: hashHex(access),
        refresh_token_hash: hashHex(newRefresh),
        access_token_expires_at: accessExp.toISOString(),
        refresh_token_expires_at: refreshExp.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
      .eq('refresh_token_hash', refreshHash)

    if (error) return json({ error: 'TOKEN_ROTATION_FAILED' }, 500)
    return json({ access_token: access, token_type: 'Bearer', expires_in: 3600, scope: row.scopes.join(' '), refresh_token: newRefresh })
  }

  if (!parsed.code || !parsed.redirect_uri || !parsed.code_verifier) {
    return json({ error: 'INVALID_GRANT_REQUEST' }, 400)
  }

  const codeHash = hashHex(parsed.code)
  const { data: row, error: lookupError } = await admin
    .from('developer_oauth_authorizations')
    .select('id,scopes,authorization_code_expires_at,redirect_uri,code_challenge,code_challenge_method,used_at')
    .eq('app_id', parsed.client_id)
    .eq('authorization_code_hash', codeHash)
    .maybeSingle()

  if (lookupError || !row || row.used_at) return json({ error: 'INVALID_AUTHORIZATION_CODE' }, 400)
  if (row.authorization_code_expires_at && new Date(row.authorization_code_expires_at).getTime() <= Date.now()) {
    return json({ error: 'AUTHORIZATION_CODE_EXPIRED' }, 400)
  }
  if (row.redirect_uri !== parsed.redirect_uri || row.code_challenge_method !== 'S256' || !row.code_challenge) {
    return json({ error: 'PKCE_MISMATCH' }, 400)
  }
  if (!verifyPkceS256(parsed.code_verifier, row.code_challenge)) {
    return json({ error: 'PKCE_VERIFIER_INVALID' }, 400)
  }

  const access = `cat_${randomBytes(32).toString('base64url')}`
  const refresh = `crt_${randomBytes(40).toString('base64url')}`
  const now = new Date()
  const accessExp = new Date(now.getTime() + 60 * 60 * 1000)
  const refreshExp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error } = await admin
    .from('developer_oauth_authorizations')
    .update({
      access_token_hash: hashHex(access),
      refresh_token_hash: hashHex(refresh),
      access_token_expires_at: accessExp.toISOString(),
      refresh_token_expires_at: refreshExp.toISOString(),
      used_at: now.toISOString(),
      authorization_code_hash: null,
      updated_at: now.toISOString(),
    })
    .eq('id', row.id)
    .is('used_at', null)
    .eq('authorization_code_hash', codeHash)

  if (error) return json({ error: 'TOKEN_ISSUE_FAILED' }, 500)
  return json({ access_token: access, token_type: 'Bearer', expires_in: 3600, scope: row.scopes.join(' '), refresh_token: refresh })
}
