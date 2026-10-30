import { describe, expect, it } from "vitest";
import {
  inferSocialMediaType,
  normalizeUploadedMedia,
  resolveMarketplaceMediaKind,
} from "@/lib/social/publishing";

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
