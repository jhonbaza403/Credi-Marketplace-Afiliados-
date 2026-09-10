import { createClient } from '@/lib/supabase/client'

export type ChatUploadKind = 'image' | 'video' | 'audio' | 'document' | 'file'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav'])
const MAX_IMAGE = 20 * 1024 * 1024
const MAX_VIDEO = 500 * 1024 * 1024
const MAX_AUDIO = 50 * 1024 * 1024
const MAX_FILE = 100 * 1024 * 1024

function kindFor(file: File): ChatUploadKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('spreadsheet') || file.type.includes('presentation')) return 'document'
  return 'file'
}

function validate(file: File, kind: ChatUploadKind) {
  if (kind === 'image' && !IMAGE_TYPES.has(file.type)) throw new Error('Formato de imagen no compatible.')
  if (kind === 'video' && !VIDEO_TYPES.has(file.type)) throw new Error('Formato de vídeo no compatible.')
  if (kind === 'audio' && !AUDIO_TYPES.has(file.type)) throw new Error('Formato de audio no compatible.')
  const max = kind === 'image' ? MAX_IMAGE : kind === 'video' ? MAX_VIDEO : kind === 'audio' ? MAX_AUDIO : MAX_FILE
  if (file.size > max) throw new Error(`El archivo supera el máximo permitido de ${Math.round(max / 1024 / 1024)} MB.`)
}

export async function uploadCrediBusinessChatMedia(file: File) {
  const kind = kindFor(file)
  validate(file, kind)
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Debes iniciar sesión para enviar archivos.')

  const { data: signed, error: signedError } = await supabase.functions.invoke('media-upload', {
    body: { fileName: file.name, contentType: file.type, context: 'credibusiness-chat', fileSize: file.size },
  })
  if (signedError || !signed?.path || !signed?.token || !signed?.bucket) {
    const message = signed?.error === 'PLAN_STORAGE_LIMIT_REACHED'
      ? 'El archivo supera la capacidad disponible de tu plan. Amplía tu plan para continuar.'
      : 'No fue posible preparar la carga del archivo.'
    throw new Error(message)
  }

  const bucket = String(signed.bucket)
  const path = String(signed.path)
  const { error: uploadError } = await supabase.storage.from(bucket).uploadToSignedUrl(path, String(signed.token), file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) throw new Error('No fue posible completar la carga del archivo.')

  const accessUrl = `/api/chat/media?path=${encodeURIComponent(path)}`
  return { kind, name: file.name, path, url: accessUrl, bucket, size: file.size, contentType: file.type }
}

export function chatMessageType(kind: ChatUploadKind) {
  return kind === 'image' ? 'image' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : kind === 'document' ? 'document' : 'file'
}
