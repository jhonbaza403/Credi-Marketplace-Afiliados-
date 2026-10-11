import { createClient } from '@/lib/supabase/client'

export const MARKETPLACE_MEDIA_BUCKET = 'marketplace-media'

export type MarketplaceMediaKind = 'image' | 'video' | 'audio' | 'mixed'

export interface UploadedMarketplaceMedia {
  kind: MarketplaceMediaKind
  name: string
  path: string
  url: string
  size: number
  contentType: string
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const AUDIO_TYPES = new Set(['audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/opus', 'audio/webm', 'audio/wav', 'audio/x-m4a', 'audio/x-wav'])
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const MAX_VIDEO_SIZE = 500 * 1024 * 1024
const MAX_AUDIO_SIZE = 500 * 1024 * 1024

export function validateMarketplaceMedia(file: File, kind?: MarketplaceMediaKind) {
  const inferredKind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
  const validKind = kind === 'mixed' ? inferredKind : (kind ?? inferredKind)
  const allowed = validKind === 'video' ? VIDEO_TYPES : validKind === 'audio' ? AUDIO_TYPES : IMAGE_TYPES
  const maxSize = validKind === 'video' ? MAX_VIDEO_SIZE : validKind === 'audio' ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE

  if (!allowed.has(file.type)) {
    throw new Error(validKind === 'video'
      ? 'Formato de vídeo no compatible. Usa MP4, WebM o MOV.'
      : validKind === 'audio'
        ? 'Formato de audio no compatible. Usa MP3, MP4, OGG, WebM o WAV.'
        : 'Formato de imagen no compatible. Usa JPG, PNG, WebP o GIF.')
  }

  if (file.size > maxSize) {
    throw new Error(validKind === 'video'
      ? 'El vídeo supera el máximo de 500 MB.'
      : validKind === 'audio'
        ? 'El audio supera el máximo de 500 MB.'
        : 'La imagen supera el máximo de 20 MB.')
  }
}

export async function uploadMarketplaceMedia(file: File, kind?: MarketplaceMediaKind) {
  const resolvedKind = kind ?? (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image')
  validateMarketplaceMedia(file, resolvedKind)

  const supabase = createClient()
  if (!supabase) {
    throw new Error('La carga multimedia no está configurada: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno de este despliegue.')
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Debes iniciar sesión para cargar archivos.')

  const { data: signed, error: signedError } = await supabase.functions.invoke('media-upload', {
    body: { fileName: file.name, contentType: file.type, context: 'marketplace', fileSize: file.size },
  })

  if (signedError || !signed?.path || !signed?.token || !signed?.bucket) {
    let detail = signedError?.message || 'La función de almacenamiento devolvió una respuesta incompleta.'
    const context = signedError && 'context' in signedError ? signedError.context : null
    if (context instanceof Response) {
      const responseBody = await context.clone().json().catch(() => null) as { error?: unknown; message?: unknown } | null
      if (typeof responseBody?.error === 'string') detail = responseBody.error
      else if (typeof responseBody?.message === 'string') detail = responseBody.message
      detail = `HTTP ${context.status}: ${detail}`
    }
    throw new Error(`No se pudo preparar la carga multimedia. ${detail} Comprueba que la función Supabase "media-upload" esté desplegada y que las variables de entorno y permisos estén configurados.`)
  }

  const { error: uploadError } = await supabase.storage
    .from(String(signed.bucket))
    .uploadToSignedUrl(String(signed.path), String(signed.token), file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) throw new Error(`No se pudo completar la carga multimedia: ${uploadError.message}. Comprueba el bucket marketplace-media, sus límites y las políticas de Storage.`)

  const { data } = supabase.storage.from(String(signed.bucket)).getPublicUrl(String(signed.path))
  return {
    kind: resolvedKind,
    name: file.name,
    path: String(signed.path),
    url: data.publicUrl,
    size: file.size,
    contentType: file.type,
  } satisfies UploadedMarketplaceMedia
}
