import { createClient } from '@/lib/supabase/client'

export const CREDICHAT_AUDIO_BUCKET = 'credichat-private'
export const CREDICHAT_AUDIO_MAX_SIZE = 15 * 1024 * 1024

const AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
])

export function audioMimeTypeSupported(contentType: string) {
  const normalized = contentType.toLowerCase().split(';', 1)[0]
  return AUDIO_TYPES.has(normalized)
}

export function validateCrediChatAudio(file: File) {
  if (!audioMimeTypeSupported(file.type)) {
    throw new Error('Formato de audio no compatible. Usa WebM/Opus, OGG, M4A, MP3 o WAV.')
  }
  if (file.size <= 0) throw new Error('La grabación de audio está vacía.')
  if (file.size > CREDICHAT_AUDIO_MAX_SIZE) throw new Error('La grabación supera el máximo de 15 MB.')
}

export async function uploadCrediChatAudio(file: File) {
  validateCrediChatAudio(file)
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Debes iniciar sesión para enviar audio.')

  const requestedType = file.type || 'audio/webm'
  const contentType = requestedType.toLowerCase().startsWith('audio/webm') ? 'audio/webm' : requestedType.split(';', 1)[0]
  const extension = contentType === 'audio/webm' ? 'webm' : contentType.split('/')[1]?.replace('x-', '') || 'bin'
  const fileName = file.name || `voice-${Date.now()}.${extension}`

  const { data: signed, error: signedError } = await supabase.functions.invoke('media-upload', {
    body: {
      fileName,
      contentType,
      context: 'credibusiness-chat',
      fileSize: file.size,
    },
  })

  if (signedError || !signed?.path || !signed?.token || signed.bucket !== CREDICHAT_AUDIO_BUCKET) {
    throw new Error('No fue posible preparar la carga del audio.')
  }

  const { error: uploadError } = await supabase.storage
    .from(CREDICHAT_AUDIO_BUCKET)
    .uploadToSignedUrl(String(signed.path), String(signed.token), file, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) throw new Error('No fue posible completar la carga del audio.')

  return { bucket: CREDICHAT_AUDIO_BUCKET, path: String(signed.path), name: fileName, contentType, size: file.size }
}
