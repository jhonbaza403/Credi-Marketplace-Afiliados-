// ============================================================
// Credi Marketplace — Social publishing providers
// ============================================================
// This file contains capability metadata only. OAuth credentials,
// access tokens and platform secrets must remain server-side.
// Actual API publishing is enabled only after the provider's app,
// scopes, review and account authorization requirements are met.

export const SOCIAL_PUBLISHING_PROVIDERS = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    kind: "social",
    capabilities: ["video", "photo", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  tiktok_shop: {
    id: "tiktok_shop",
    name: "TikTok Shop",
    kind: "commerce",
    capabilities: ["product", "catalog", "order", "creator"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    kind: "video",
    capabilities: ["video", "short", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    kind: "social",
    capabilities: ["photo", "video", "reel", "story", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    kind: "social",
    capabilities: ["photo", "video", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  threads: {
    id: "threads",
    name: "Threads",
    kind: "social",
    capabilities: ["text", "photo", "video", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    kind: "social",
    capabilities: ["pin", "product", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    kind: "professional",
    capabilities: ["text", "photo", "video", "link"],
    requiresOAuth: true,
    requiresProviderApproval: true,
  },
} as const;

export type SocialPublishingProviderId = keyof typeof SOCIAL_PUBLISHING_PROVIDERS;

export function getSocialPublishingProvider(id: string) {
  if (!(id in SOCIAL_PUBLISHING_PROVIDERS)) return null;
  return SOCIAL_PUBLISHING_PROVIDERS[id as SocialPublishingProviderId];
}
