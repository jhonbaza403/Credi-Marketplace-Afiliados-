import {
  getAllowedMediaUploadMimeTypes,
  isAllowedMediaUploadMimeType,
  MEDIA_UPLOAD_MAX_BYTES,
} from './media-upload-policy.ts';

Deno.test('marketplace uploads accept configured image, video and audio MIME types', () => {
  const supported = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/mpeg',
    'audio/ogg', 'audio/opus', 'audio/webm', 'audio/wav', 'audio/x-m4a', 'audio/x-wav',
  ];

  for (const mime of supported) {
    if (!isAllowedMediaUploadMimeType('marketplace', mime)) {
      throw new Error(`marketplace unexpectedly rejected ${mime}`);
    }
  }
});

Deno.test('marketplace uploads reject PDF and unsupported MIME types', () => {
  if (isAllowedMediaUploadMimeType('marketplace', 'application/pdf')) {
    throw new Error('marketplace must not accept PDF');
  }
  if (isAllowedMediaUploadMimeType('marketplace', 'image/svg+xml')) {
    throw new Error('marketplace must not accept SVG');
  }
});

Deno.test('private Credi Chat accepts configured media and PDF attachments', () => {
  const allowed = getAllowedMediaUploadMimeTypes('credibusiness-chat');
  if (!allowed.includes('application/pdf')) throw new Error('private chat must accept PDF');
  if (!allowed.includes('audio/mpeg')) throw new Error('private chat must accept audio');
  if (!allowed.includes('video/mp4')) throw new Error('private chat must accept video');
});

Deno.test('both upload contexts share the configured 500 MiB Storage ceiling', () => {
  if (MEDIA_UPLOAD_MAX_BYTES !== 524288000) {
    throw new Error(`unexpected media bucket limit: ${MEDIA_UPLOAD_MAX_BYTES}`);
  }
});
