import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PUBLIC_BUCKET = 'marketplace-media'
const PRIVATE_BUCKET = 'credichat-private'
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav',
  'audio/aac', 'audio/flac', 'audio/m4a', 'audio/opus', 'audio/x-m4a',
  'application/pdf',
]
const PRIVATE_CHAT_ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav',
  'application/pdf',
])
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
  try {
    const url = new URL(origin)
    if (url.origin !== origin) return null
    const host = url.hostname.toLowerCase()
    const production = host === 'credi-marketplace-afiliados.vercel.app'
    const deployment = /^credi-marketplace-afiliados-[a-z0-9-]+\.vercel\.app$/i.test(host)
    const branchAlias = /^credi-marketplace-afilia-git-[a-z0-9-]+-credi-marketplace-afiliados\.vercel\.app$/i.test(host)
    const legacyPreview = /^credi-marketplace-afiliados-[a-z0-9-]+-bazwjhon-2554s-projects\.vercel\.app$/i.test(host)
    if (url.protocol === 'https:' && (production || deployment || branchAlias || legacyPreview)) return origin
    if (url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1') && url.port === '3000') return origin
  } catch {
    return null
  }
  return null
}
function response(body: unknown, status = 200, origin: string | null = null) {
  const headers = new Headers(JSON_HEADERS)
  const safeOrigin = allowedOrigin(origin)
  if (safeOrigin) { headers.set('access-control-allow-origin', safeOrigin); headers.set('vary', 'Origin') }
  return new Response(JSON.stringify(body), { status, headers })
}
async function planStorageLimit(userId: string) {
  const { data: sub } = await supabase.from('subscriptions').select('plan_id,plans(code,limits)').eq('user_id', userId).in('status',['active','trialing','past_due']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if (sub?.plans && typeof sub.plans === 'object' && !Array.isArray(sub.plans)) {
    const limits = (sub.plans as { limits?: unknown }).limits
    if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
      const storageMb = Number((limits as Record<string, unknown>).storage_mb)
      if (Number.isFinite(storageMb) && storageMb > 0) return storageMb
    }
  }
  const { data: free } = await supabase.from('plans').select('limits').eq('code','free').eq('is_active',true).maybeSingle()
  if (free?.limits && typeof free.limits === 'object' && !Array.isArray(free.limits)) {
    const storageMb = Number((free.limits as Record<string, unknown>).storage_mb)
    if (Number.isFinite(storageMb) && storageMb > 0) return storageMb
  }
  return 250
}
async function privateStorageUsedBytes(userId: string) {
  let offset = 0
  let totalBytes = 0
  const pageSize = 100
  while (true) {
    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).list(userId, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    const items = data ?? []
    totalBytes += items.reduce((total, item) => {
      const metadata = item.metadata as Record<string, unknown> | null
      const size = Number(metadata?.size ?? 0)
      return total + (Number.isFinite(size) ? size : 0)
    }, 0)
    if (items.length < pageSize) break
    offset += items.length
    if (offset > 100000) throw new Error('PRIVATE_STORAGE_LIST_LIMIT_EXCEEDED')
  }
  return totalBytes
}
Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  let stage = 'request'
  let context = 'unknown'
  let userId = 'unknown'
  try {
  if (request.method === 'OPTIONS') {
    const headers = new Headers(JSON_HEADERS)
    const safeOrigin = allowedOrigin(origin)
    if (safeOrigin) { headers.set('access-control-allow-origin',safeOrigin); headers.set('vary','Origin') }
    return new Response(null,{status:204,headers})
  }
  if (request.method !== 'POST') return response({error:'METHOD_NOT_ALLOWED'},405,origin)
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return response({error:'UNAUTHORIZED'},401,origin)
  const token = auth.slice('Bearer '.length)
  stage = 'auth.getUser'
  const { data:userData,error:userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return response({error:'UNAUTHORIZED'},401,origin)
  let payload: {fileName?:string;contentType?:string;context?:string;fileSize?:number}
  try { payload = await request.json() } catch { return response({error:'INVALID_JSON'},400,origin) }
  context = String(payload.context ?? 'marketplace').trim().toLowerCase()
  stage = 'validate_payload'
  const fileName = String(payload.fileName ?? '').trim()
  const contentType = String(payload.contentType ?? '').trim().toLowerCase()
  const fileSize = Number(payload.fileSize ?? 0)
  if (!fileName || fileName.length > 180) return response({error:'INVALID_FILE_NAME'},400,origin)
  if (!ALLOWED.includes(contentType)) return response({error:'UNSUPPORTED_MEDIA_TYPE'},415,origin)
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return response({error:'INVALID_FILE_SIZE'},400,origin)
  userId = userData.user.id
  const isPrivateChat = context === 'credibusiness-chat'
  const bucket = isPrivateChat ? PRIVATE_BUCKET : PUBLIC_BUCKET
  const bucketLimit = isPrivateChat ? PRIVATE_CHAT_MAX : PUBLIC_MAX
  const allowedForContext = isPrivateChat
    ? PRIVATE_CHAT_ALLOWED
    : new Set(ALLOWED.filter((type) =>
        type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/'),
      ))
  if (!allowedForContext.has(contentType)) return response({error:'UNSUPPORTED_MEDIA_TYPE'},415,origin)
  if (fileSize > bucketLimit) return response({error:'FILE_TOO_LARGE'},413,origin)
  if (isPrivateChat) {
    stage = 'plan_storage_limit'
    const storageMb = await planStorageLimit(userData.user.id)
    const limitBytes = Math.floor(storageMb*1024*1024)
    stage = 'private_storage_usage'
    const usedBytes = await privateStorageUsedBytes(userData.user.id)
    if (usedBytes + fileSize > limitBytes) return response({error:'PLAN_STORAGE_LIMIT_REACHED',storageMb,usedBytes,requestedBytes:fileSize},413,origin)
  }
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-120)
  const path = `${userData.user.id}/${crypto.randomUUID()}-${safeName}`
  // Bucket configuration is managed administratively, not on every upload.
  // Rewriting bucket settings per request can fail due to Storage permissions and
  // prevents otherwise valid uploads. Only create a missing bucket; never mutate
  // an existing bucket in the hot path.
  const publicBucket = !isPrivateChat
  stage = 'storage.get_bucket'
  const { error: bucketError } = await supabase.storage.getBucket(bucket)
  if (bucketError && /not found|does not exist/i.test(bucketError.message)) {
    stage = 'storage.create_bucket'
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: publicBucket,
      fileSizeLimit: bucketLimit,
      allowedMimeTypes: [...allowedForContext],
    })
    if (createError && !/already exists/i.test(createError.message)) {
      console.error('[media-upload] bucket creation failed', { stage, bucket, message: createError.message })
      return response({ error: 'BUCKET_ERROR', stage }, 503, origin)
    }
  } else if (bucketError) {
    console.error('[media-upload] bucket lookup failed', { stage, bucket, message: bucketError.message })
    return response({ error: 'BUCKET_ERROR', stage }, 503, origin)
  }
  stage = 'storage.create_signed_upload_url'
  const {data,error} = await supabase.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) { console.error('[media-upload] signed URL failed', { stage, bucket, message: error?.message ?? 'missing signed URL data' }); return response({error:'UPLOAD_URL_ERROR',stage},503,origin) }
  return response({bucket,path,token:data.token,private:isPrivateChat},200,origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[media-upload] unhandled error', { stage, context, userId, message })
    return response({error:'INTERNAL_ERROR',stage},503,origin)
  }
})