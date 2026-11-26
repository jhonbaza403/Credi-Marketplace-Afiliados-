import { describe, expect, it } from "vitest";
import {
  inferSocialMediaType,
  normalizeUploadedMedia,
  resolveMarketplaceMediaKind,
} from "@/lib/social/publishing";
import { validateSocialMediaLimit } from "@/lib/social/publishing-limits";

describe("Credi social publishing media contract", () => {
  it("converts mixed image uploads to the API image type", () => {
    expect(resolveMarketplaceMediaKind("image/webp", "mixed")).toBe("image");
  });

  it("converts mixed video uploads to the API video type", () => {
    expect(resolveMarketplaceMediaKind("video/mp4", "mixed")).toBe("video");
  });

  it("keeps explicit media kinds and infers omitted kinds", () => {
    expect(resolveMarketplaceMediaKind("video/webm", "video")).toBe("video");
    expect(resolveMarketplaceMediaKind("audio/mpeg")).toBe("audio");
    expect(inferSocialMediaType("image/jpeg")).toBe("image");
  });

  it("normalizes a mixed gallery into concrete API media objects", () => {
    expect(normalizeUploadedMedia([
      { kind: "mixed", contentType: "image/jpeg", url: "https://cdn.example/image.jpg" },
      { kind: "mixed", contentType: "video/mp4", url: "https://cdn.example/video.mp4" },
    ])).toEqual([
      { type: "image", url: "https://cdn.example/image.jpg" },
      { type: "video", url: "https://cdn.example/video.mp4" },
    ]);
  });

  it("rejects unsupported media MIME types instead of sending a false type", () => {
    expect(() => inferSocialMediaType("application/pdf")).toThrow(
      "El archivo no tiene un tipo de imagen, vídeo o audio compatible.",
    );
  });
});

describe("server-side social media count contract", () => {
  const image = (n: number) => ({ type: "image" as const, url: `https://cdn.example/${n}.jpg` });
  const video = { type: "video" as const, url: "https://cdn.example/video.mp4" };
  const audio = { type: "audio" as const, url: "https://cdn.example/audio.mp3" };

  it("allows up to ten images in a post", () => {
    expect(validateSocialMediaLimit("post", Array.from({ length: 10 }, (_, i) => image(i))).ok).toBe(true);
  });

  it("rejects an eleventh image in a post", () => {
    const result = validateSocialMediaLimit("post", Array.from({ length: 11 }, (_, i) => image(i)));
    expect(result).toMatchObject({ ok: false, code: "MEDIA_LIMIT_EXCEEDED" });
  });

  it("allows one video as a post's only media item", () => {
    expect(validateSocialMediaLimit("post", [video])).toEqual({ ok: true });
  });

  it("rejects mixing a video with post images", () => {
    expect(validateSocialMediaLimit("post", [image(1), video])).toMatchObject({
      ok: false,
      code: "POST_MEDIA_COMBINATION_INVALID",
    });
  });

  it("allows one audio item but does not mix it with images", () => {
    expect(validateSocialMediaLimit("post", [audio])).toEqual({ ok: true });
    expect(validateSocialMediaLimit("post", [image(1), audio]).ok).toBe(false);
  });

  it("allows at most one item for a story", () => {
    expect(validateSocialMediaLimit("story", [image(1)]).ok).toBe(true);
    expect(validateSocialMediaLimit("story", [image(1), image(2)]).ok).toBe(false);
  });

  it("requires exactly one video for a reel", () => {
    expect(validateSocialMediaLimit("reel", [video])).toEqual({ ok: true });
    expect(validateSocialMediaLimit("reel", [image(1)])).toMatchObject({
      ok: false,
      code: "REEL_VIDEO_REQUIRED",
    });
    expect(validateSocialMediaLimit("reel", [video, image(1)]).ok).toBe(false);
  });

  it("allows at most one creative for an ad", () => {
    expect(validateSocialMediaLimit("ad", [image(1)]).ok).toBe(true);
    expect(validateSocialMediaLimit("ad", [image(1), video]).ok).toBe(false);
  });
});
