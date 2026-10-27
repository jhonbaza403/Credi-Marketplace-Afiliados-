const VIDEO_ID = /^[A-Za-z0-9_-]{16,128}$/;

const STREAM_HOSTS = new Set(["videodelivery.net", "iframe.videodelivery.net"]);

function isCloudflareStreamHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return STREAM_HOSTS.has(host) || host.endsWith(".videodelivery.net") || host.endsWith(".cloudflarestream.com");
}

/**
 * Converts a trusted Cloudflare Stream HLS manifest or player URL to the
 * cross-browser Stream iframe player. Returns null for untrusted or
 * unexpected URLs so external values are never embedded blindly.
 */
export function cloudflareStreamPlayerUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !isCloudflareStreamHost(url.hostname)) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 1 && VIDEO_ID.test(segments[0])) {
      return `https://iframe.videodelivery.net/${segments[0]}`;
    }

    if (
      segments.length === 3 &&
      VIDEO_ID.test(segments[0]) &&
      segments[1] === "manifest" &&
      /^(video|audio)\.m3u8$/i.test(segments[2])
    ) {
      return `https://iframe.videodelivery.net/${segments[0]}`;
    }

    return null;
  } catch {
    return null;
  }
}
