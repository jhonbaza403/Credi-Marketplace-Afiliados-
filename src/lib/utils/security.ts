const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: string, maxLength = 10_000): string {
  return value.replace(CONTROL_CHARACTERS, "").trim().slice(0, maxLength);
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
  if (normalized.includes("\\")) return fallback;
  return normalized;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function constantTimeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
