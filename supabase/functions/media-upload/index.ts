import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PUBLIC_BUCKET = 'marketplace-media'
const PRIVATE_BUCKET = 'credichat-private'
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/opus', 'audio/webm', 'audio/wav', 'audio/x-m4a', 'audio/x-wav',
  'application/pdf',
]
const PRIVATE_CHAT_ALLOWED = new Set(ALLOWED)
const PRIVATE_CHAT_MAX = 524288000
const PUBLIC_MAX = 524288000

const JSON_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
}

function allowedOrigin(origin: string | null) {
  if (!origin) return null
  if (origin === 'https://credi-marketplace-afiliados.vercel.app' || origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') return origin
  if (/^https:\/\/credi-marketplace-afiliados-[a-z0-9-]+-bazwjhon-2554s-projects\.vercel\.app$/i.test(origin)) return origin
  return null
}

function response(body: unknown, status = 200, origin: string | null = null) {
  const headers = new Headers(JSON_HEADERS)
  const safeOrigin = allowedOrigin(origin)
  if (safeOrigin) {
    headers.set('access-control-allow-origin', safeOrigin)
    headers.set('vary', 'Origin')
  }
  return new Response(JSON.stringify(body), { status, headers })
}

async function planStorageLimit(userId: string) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id,plans(code,limits)')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sub?.plans && typeof sub.plans === 'object' && !Array.isArray(sub.plans)) {
    const limits = (sub.plans as { limits?: unknown }).limits
    if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
      const storageMb = Number((limits as Record<string, unknown>).storage_mb)
      if (Number.isFinite(storageMb) && storageMb > 0) return storageMb
    }
  }

  const { data: free } = await supabase.from('plans').select('limits').eq('code', 'free').eq('is_active', true).maybeSingle()
  if (free?.limits && typeof free.limits === 'object' && !Array.isArray(free.limits)) {
    const storageMb = Number((free.limits as Record<string, unknown>).storage_mb)
    if (Number.isFinite(storageMb) && storageMb > 0) return storageMb
  }
  return 250
}

async function privateStorageUsedBytes(userId: string) {
  const prefix = `${userId}/`
  const { data, error } = await supabase
    .from('objects')
    .select('metadata')
    .eq('bucket_id', PRIVATE_BUCKET)
    .like('name', `${prefix}%`)
  if (error) throw error
  return (data ?? []).reduce((total, row) => {
    const metadata = row.metadata as Record<string, unknown> | null
    const size = Number(metadata?.size ?? 0)
    return total + (Number.isFinite(size) ? size : 0)
  }, 0)
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') {
    const headers = new Headers(JSON_HEADERS)
    const safeOrigin = allowedOrigin(origin)
    if (safeOrigin) {
      headers.set('access-control-allow-origin', safeOrigin)
      headers.set('vary', 'Origin')
    }
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== 'POST') return response({ error: 'METHOD_NOT_ALLOWED' }, 405, origin)

  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return response({ error: 'UNAUTHORIZED' }, 401, origin)

  const token = auth.slice('Bearer '.length)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return response({ error: 'UNAUTHORIZED' }, 401, origin)

  let payload: { fileName?: string; contentType?: string; context?: string; fileSize?: number }
  try { payload = await request.json() } catch { return response({ error: 'INVALID_JSON' }, 400, origin) }

  const fileName = String(payload.fileName ?? '').trim()
  const contentType = String(payload.contentType ?? '').trim().toLowerCase()
  const context = String(payload.context ?? 'marketplace').trim().toLowerCase()
  const fileSize = Number(payload.fileSize ?? 0)
  if (!fileName || fileName.length > 180) return response({ error: 'INVALID_FILE_NAME' }, 400, origin)
  if (!ALLOWED.includes(contentType)) return response({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415, origin)
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return response({ error: 'INVALID_FILE_SIZE' }, 400, origin)

  const isPrivateChat = context === 'credibusiness-chat'
  const bucket = isPrivateChat ? PRIVATE_BUCKET : PUBLIC_BUCKET
  const bucketLimit = isPrivateChat ? PRIVATE_CHAT_MAX : PUBLIC_MAX
  const allowedForContext = isPrivateChat
    ? PRIVATE_CHAT_ALLOWED
    : new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
  if (!allowedForContext.has(contentType)) return response({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415, origin)
  if (fileSize > bucketLimit) return response({ error: 'FILE_TOO_LARGE' }, 413, origin)

  if (isPrivateChat) {
    const storageMb = await planStorageLimit(userData.user.id)
    const limitBytes = Math.floor(storageMb * 1024 * 1024)
    const usedBytes = await privateStorageUsedBytes(userData.user.id)
    if (usedBytes + fileSize > limitBytes) return response({ error: 'PLAN_STORAGE_LIMIT_REACHED', storageMb, usedBytes, requestedBytes: fileSize }, 413, origin)
  }

  const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120)
  const path = `${userData.user.id}/${crypto.randomUUID()}-${safeName}`
  const publicBucket = !isPrivateChat

  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucket)
  if (bucketError && /not found|does not exist/i.test(bucketError.message)) {
    const { error: createError } = await supabase.storage.createBucket(bucket, { public: publicBucket, fileSizeLimit: bucketLimit, allowedMimeTypes: [...allowedForContext] })
    if (createError && !/already exists/i.test(createError.message)) return response({ error: 'BUCKET_ERROR' }, 500, origin)
  } else if (!bucketError && bucketData) {
    const { error: updateError } = await supabase.storage.updateBucket(bucket, { public: publicBucket, fileSizeLimit: bucketLimit, allowedMimeTypes: [...allowedForContext] })
    if (updateError) return response({ error: 'BUCKET_CONFIG_ERROR' }, 500, origin)
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) return response({ error: 'UPLOAD_URL_ERROR' }, 500, origin)
  return response({ bucket, path, token: data.token, private: isPrivateChat }, 200, origin)
})
