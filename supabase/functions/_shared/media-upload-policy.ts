export const MEDIA_UPLOAD_MAX_BYTES = 524288000;

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

const PRIVATE_CHAT_ALLOWED_MIME_TYPES: readonly string[] = [
  ...MARKETPLACE_ALLOWED_MIME_TYPES,
  'application/pdf',
];

export function getAllowedMediaUploadMimeTypes(context: string): readonly string[] {
  return context === 'credibusiness-chat'
    ? PRIVATE_CHAT_ALLOWED_MIME_TYPES
    : MARKETPLACE_ALLOWED_MIME_TYPES;
}

export function isAllowedMediaUploadMimeType(context: string, contentType: string): boolean {
  return getAllowedMediaUploadMimeTypes(context).includes(contentType);
}
