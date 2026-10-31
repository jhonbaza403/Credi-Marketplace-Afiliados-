export type MarketplaceMediaKind = "image" | "video" | "audio" | "mixed";
export type SocialMediaType = Exclude<MarketplaceMediaKind, "mixed">;

export function inferSocialMediaType(contentType: string): SocialMediaType {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("image/")) return "image";
  throw new Error("El archivo no tiene un tipo de imagen, vídeo o audio compatible.");
}

/**
 * "mixed" is an uploader mode, never a media type to persist or send to the API.
 * Resolve it from the actual MIME type before validation, storage metadata or publishing.
 */
export function resolveMarketplaceMediaKind(
  contentType: string,
  requestedKind?: MarketplaceMediaKind,
): SocialMediaType {
  const inferred = inferSocialMediaType(contentType);
  return requestedKind === "mixed" ? inferred : requestedKind ?? inferred;
}

export function normalizeUploadedMedia(
  items: readonly { kind: MarketplaceMediaKind; contentType: string; url: string }[],
) {
  return items.map((item) => ({
    type: resolveMarketplaceMediaKind(item.contentType, item.kind),
    url: item.url,
  }));
}
