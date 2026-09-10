import { createClient } from '@/lib/supabase/client'

export const MARKETPLACE_MEDIA_BUCKET = 'marketplace-media'

export type MarketplaceMediaKind = 'image' | 'video'

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
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const MAX_VIDEO_SIZE = 500 * 1024 * 1024

export function validateMarketplaceMedia(file: File, kind?: MarketplaceMediaKind) {
  const validKind = kind ?? (file.type.startsWith('video/') ? 'video' : 'image')
  const allowed = validKind === 'video' ? VIDEO_TYPES : IMAGE_TYPES
  const maxSize = validKind === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

  if (!allowed.has(file.type)) {
    throw new Error(validKind === 'video'
      ? 'Formato de vídeo no compatible. Usa MP4, WebM o MOV.'
      : 'Formato de imagen no compatible. Usa JPG, PNG, WebP o GIF.')
  }

  if (file.size > maxSize) {
    throw new Error(validKind === 'video'
      ? 'El vídeo supera el máximo de 500 MB.'
      : 'La imagen supera el máximo de 20 MB.')
  }
}

export async function uploadMarketplaceMedia(file: File, kind?: MarketplaceMediaKind) {
  const resolvedKind = kind ?? (file.type.startsWith('video/') ? 'video' : 'image')
  validateMarketplaceMedia(file, resolvedKind)

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Debes iniciar sesión para cargar archivos.')

  const { data: signed, error: signedError } = await supabase.functions.invoke('media-upload', {
    body: { fileName: file.name, contentType: file.type, context: 'marketplace', fileSize: file.size },
  })

  if (signedError || !signed?.path || !signed?.token || !signed?.bucket) {
    throw new Error('No fue posible preparar la carga del archivo.')
  }

  const { error: uploadError } = await supabase.storage
    .from(String(signed.bucket))
    .uploadToSignedUrl(String(signed.path), String(signed.token), file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    throw new Error('No fue posible completar la carga del archivo.')
  }

  const { data } = supabase.storage
    .from(String(signed.bucket))
    .getPublicUrl(String(signed.path))

  return {
    kind: resolvedKind,
    name: file.name,
    path: String(signed.path),
    url: data.publicUrl,
    size: file.size,
    contentType: file.type,
  } satisfies UploadedMarketplaceMedia
}
