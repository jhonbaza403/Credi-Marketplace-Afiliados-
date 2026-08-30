export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy':
    'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':
    'max-age=31536000; includeSubDomains; preload',
} as const

export function applySecurityHeaders(
  headers: Headers,
): Headers {
  for (
    const [name, value] of Object.entries(
      SECURITY_HEADERS,
    )
  ) {
    headers.set(name, value)
  }

  return headers
}
