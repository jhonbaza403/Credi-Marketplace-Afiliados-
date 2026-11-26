export type SocialContentType = 'post' | 'story' | 'reel' | 'ad';
export type SocialMediaType = 'image' | 'video' | 'audio';

export type SocialMediaItem = {
  type: SocialMediaType;
  url?: string;
};

export type SocialMediaLimitResult =
  | { ok: true }
  | { ok: false; code: 'MEDIA_LIMIT_EXCEEDED' | 'POST_MEDIA_COMBINATION_INVALID' | 'REEL_VIDEO_REQUIRED'; message: string };

export function validateSocialMediaLimit(
  contentType: SocialContentType,
  media: readonly SocialMediaItem[],
): SocialMediaLimitResult {
  if (contentType === 'post') {
    const images = media.filter((item) => item.type === 'image').length;
    const hasVideo = media.some((item) => item.type === 'video');
    const hasAudio = media.some((item) => item.type === 'audio');

    if (media.length > 10 || images > 10) {
      return {
        ok: false,
        code: 'MEDIA_LIMIT_EXCEEDED',
        message: 'Una publicación admite un máximo de 10 imágenes.',
      };
    }

    if ((hasVideo || hasAudio) && media.length !== 1) {
      return {
        ok: false,
        code: 'POST_MEDIA_COMBINATION_INVALID',
        message: 'Una publicación admite hasta 10 imágenes o un único vídeo o audio, no una mezcla.',
      };
    }

    return { ok: true };
  }

  if (contentType === 'reel') {
    if (media.length !== 1 || media[0]?.type !== 'video') {
      return {
        ok: false,
        code: 'REEL_VIDEO_REQUIRED',
        message: 'Un reel admite exactamente un vídeo.',
      };
    }
    return { ok: true };
  }

  if (media.length > 1) {
    return {
      ok: false,
      code: 'MEDIA_LIMIT_EXCEEDED',
      message: contentType === 'story'
        ? 'Una historia admite un único archivo multimedia.'
        : 'Un anuncio admite un único archivo multimedia.',
    };
  }

  return { ok: true };
}
