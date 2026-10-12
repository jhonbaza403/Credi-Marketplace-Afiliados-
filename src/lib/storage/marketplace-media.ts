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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Debes iniciar sesión para cargar archivos.')

  const { data: signed, error: signedError } = await supabase.functions.invoke('media-upload', {
    body: { fileName: file.name, contentType: file.type, context: 'marketplace', fileSize: file.size },
  })

  if (signedError || !signed?.path || !signed?.token || !signed?.bucket) {
    const code = typeof signed?.error === 'string' ? signed.error : ''
    const messageByCode: Record<string, string> = {
      UNAUTHORIZED: 'Tu sesión caducó. Inicia sesión de nuevo y vuelve a cargar el archivo.',
      UNSUPPORTED_MEDIA_TYPE: 'El formato del archivo no está permitido.',
      INVALID_FILE_SIZE: 'El tamaño del archivo no es válido.',
      FILE_TOO_LARGE: 'El archivo supera el límite permitido por el servicio de carga.',
      BUCKET_ERROR: 'El almacenamiento de medios no está disponible. Revisa la configuración del bucket marketplace-media.',
      BUCKET_CONFIG_ERROR: 'No se pudo validar la configuración del almacenamiento de medios.',
      UPLOAD_URL_ERROR: 'No se pudo generar el enlace seguro de carga. Revisa la función media-upload en Supabase.',
    }
    throw new Error(messageByCode[code] || 'No fue posible preparar la carga. Comprueba la sesión y que la función media-upload esté desplegada en el proyecto Supabase conectado.')
  }

  const { error: uploadError } = await supabase.storage
    .from(String(signed.bucket))
    .uploadToSignedUrl(String(signed.path), String(signed.token), file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('payload too large') || message.includes('file size') || message.includes('too large')) {
      throw new Error('El archivo supera el límite de almacenamiento. Prueba con un archivo más pequeño.')
    }
    if (message.includes('mime') || message.includes('content type')) {
      throw new Error('Supabase rechazó el formato del archivo. Usa un formato admitido: JPG, PNG, WebP, GIF, MP4, WebM o MOV.')
    }
    if (message.includes('expired') || message.includes('invalid token')) {
      throw new Error('El enlace seguro de carga caducó. Selecciona el archivo de nuevo.')
    }
    throw new Error('Supabase no pudo guardar el archivo. Revisa el bucket marketplace-media, sus políticas y los límites del proyecto.')
  }

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
