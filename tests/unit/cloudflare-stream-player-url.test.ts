import { describe, expect, it } from "vitest";
import { cloudflareStreamPlayerUrl } from "@/lib/cloudflare/stream-player-url";

describe("cloudflareStreamPlayerUrl", () => {
  it("converts the standard Stream HLS manifest to the iframe player", () => {
    expect(cloudflareStreamPlayerUrl("https://videodelivery.net/0123456789abcdef0123456789abcdef/manifest/video.m3u8"))
      .toBe("https://iframe.videodelivery.net/0123456789abcdef0123456789abcdef");
  });

  it("supports customer.cloudflarestream.com playback URLs", () => {
    expect(cloudflareStreamPlayerUrl("https://customer-abc.cloudflarestream.com/0123456789abcdef0123456789abcdef/manifest/video.m3u8?foo=bar"))
      .toBe("https://iframe.videodelivery.net/0123456789abcdef0123456789abcdef");
  });

  it("supports a direct Cloudflare Stream video/player URL", () => {
    expect(cloudflareStreamPlayerUrl("https://iframe.videodelivery.net/0123456789abcdef0123456789abcdef"))
      .toBe("https://iframe.videodelivery.net/0123456789abcdef0123456789abcdef");
  });

  it("rejects non-HTTPS, non-Cloudflare, and malformed URLs", () => {
    expect(cloudflareStreamPlayerUrl("http://videodelivery.net/0123456789abcdef0123456789abcdef/manifest/video.m3u8")).toBeNull();
    expect(cloudflareStreamPlayerUrl("https://attacker.example/0123456789abcdef0123456789abcdef/manifest/video.m3u8")).toBeNull();
    expect(cloudflareStreamPlayerUrl("https://notcloudflarestream.com/0123456789abcdef0123456789abcdef/manifest/video.m3u8")).toBeNull();
    expect(cloudflareStreamPlayerUrl("not a URL")).toBeNull();
    expect(cloudflareStreamPlayerUrl(null)).toBeNull();
  });
});
