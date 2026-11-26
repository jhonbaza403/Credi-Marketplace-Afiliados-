export const MEDIA_UPLOAD_MAX_BYTES = 524288000;
export const MEDIA_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const PRIVATE_CHAT_AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const PRIVATE_CHAT_DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;

const MARKETPLACE_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/webm',
  'audio/wav',
  'audio/x-m4a',
  'audio/x-wav',
];

const PRIVATE_CHAT_DOCUMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const PRIVATE_CHAT_ALLOWED_MIME_TYPES: readonly string[] = [
  ...MARKETPLACE_ALLOWED_MIME_TYPES,
  ...PRIVATE_CHAT_DOCUMENT_MIME_TYPES,
];

export function getAllowedMediaUploadMimeTypes(context: string): readonly string[] {
  return context === 'credibusiness-chat'
    ? PRIVATE_CHAT_ALLOWED_MIME_TYPES
    : MARKETPLACE_ALLOWED_MIME_TYPES;
}

export function isAllowedMediaUploadMimeType(context: string, contentType: string): boolean {
  return getAllowedMediaUploadMimeTypes(context).includes(contentType);
}

export function getMaxMediaUploadBytes(context: string, contentType: string): number {
  if (contentType.startsWith('image/')) return MEDIA_IMAGE_MAX_BYTES;
  if (contentType.startsWith('video/')) return MEDIA_UPLOAD_MAX_BYTES;
  if (contentType.startsWith('audio/')) {
    return context === 'credibusiness-chat' ? PRIVATE_CHAT_AUDIO_MAX_BYTES : MEDIA_UPLOAD_MAX_BYTES;
  }
  if (context === 'credibusiness-chat' && PRIVATE_CHAT_DOCUMENT_MIME_TYPES.includes(contentType)) {
    return PRIVATE_CHAT_DOCUMENT_MAX_BYTES;
  }
  return 0;
}
