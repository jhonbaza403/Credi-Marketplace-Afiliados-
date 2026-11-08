import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  isAllowedKycDocumentType,
  isAllowedKycMimeType,
  isValidKycFileSize,
  sanitizeKycFileName,
} from '../_shared/kyc-upload-policy.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'kyc-documents'

const HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
}

function allowedOrigin(origin: string | null) {
  if (!origin) return null
  try {
    const url = new URL(origin)
    if (url.origin !== origin) return null
    const host = url.hostname.toLowerCase()
    const production = host === 'credi-marketplace-afiliados.vercel.app'
    const deployment = host === 'credi-marketplace-afiliados-1owsvvxbn.vercel.app'
    const branchAlias = /^credi-marketplace-afilia-git-[a-z0-9-]+-credi-marketplace-afiliados\.vercel\.app$/i.test(host)
    const legacyPreview = /^credi-marketplace-afiliados-[a-z0-9-]+-bazwjhon-2554s-projects\.vercel\.app$/i.test(host)
    if (url.protocol === 'https:' && (production || deployment || branchAlias || legacyPreview)) return origin
    if (url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1') && url.port === '3000') return origin
  } catch {
    return null
  }
  return null
}

function json(body: unknown, status: number, origin: string | null) {
  const headers = new Headers(HEADERS)
  const safeOrigin = allowedOrigin(origin)
  if (safeOrigin) {
    headers.set('access-control-allow-origin', safeOrigin)
    headers.set('vary', 'Origin')
  }
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') {
    const headers = new Headers(HEADERS)
    const safeOrigin = allowedOrigin(origin)
    if (safeOrigin) {
      headers.set('access-control-allow-origin', safeOrigin)
      headers.set('vary', 'Origin')
    }
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, origin)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'UNAUTHORIZED' }, 401, origin)

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7))
    if (authError || !authData.user) return json({ error: 'UNAUTHORIZED' }, 401, origin)

    let payload: { fileName?: string; contentType?: string; fileSize?: number; documentType?: string }
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'INVALID_JSON' }, 400, origin)
    }

    const fileName = String(payload.fileName ?? '').trim()
    const contentType = String(payload.contentType ?? '').trim().toLowerCase()
    const fileSize = Number(payload.fileSize ?? 0)
    const documentType = String(payload.documentType ?? '').trim()

    if (!fileName || fileName.length > 180) return json({ error: 'INVALID_FILE_NAME' }, 400, origin)
    if (!isAllowedKycDocumentType(documentType)) {
      return json({ error: 'INVALID_DOCUMENT_TYPE' }, 400, origin)
    }
    if (!isAllowedKycMimeType(documentType, contentType)) return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415, origin)
    if (!isValidKycFileSize(fileSize)) {
      return json({ error: 'INVALID_FILE_SIZE' }, 413, origin)
    }

    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET)
    if (bucketError || !bucket || bucket.public !== false) {
      console.error('[kyc-upload] private bucket unavailable or public', bucketError?.message ?? 'bucket not private')
      return json({ error: 'PRIVATE_BUCKET_UNAVAILABLE' }, 503, origin)
    }

    const safeName = sanitizeKycFileName(fileName)
    const path = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
    if (signedError || !signed) {
      console.error('[kyc-upload] signed upload URL failed', signedError?.message ?? 'missing response')
      return json({ error: 'UPLOAD_URL_ERROR' }, 503, origin)
    }

    return json({ bucket: BUCKET, path, token: signed.token, private: true }, 200, origin)
  } catch (error) {
    console.error('[kyc-upload] unexpected failure', error instanceof Error ? error.message : String(error))
    return json({ error: 'INTERNAL_ERROR' }, 503, origin)
  }
})
