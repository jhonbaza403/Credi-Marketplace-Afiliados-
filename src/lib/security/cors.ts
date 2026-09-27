const originPattern = /^https:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?$/

function configuredOrigins(): Set<string> {
  const raw = process.env.DEVELOPER_CORS_ORIGINS ?? ''
  return new Set(
    raw.split(',').map((value) => value.trim()).filter(Boolean),
  )
}

export function allowedCorsOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')?.trim()
  if (!origin) return null
  const configured = configuredOrigins()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (appUrl) configured.add(appUrl)
  if (!originPattern.test(origin)) return null
  return configured.has(origin) ? origin : null
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers()
  const origin = allowedCorsOrigin(request)
  if (!origin) return headers
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'false')
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key')
  headers.set('Access-Control-Max-Age', '600')
  headers.set('Vary', 'Origin')
  return headers
}

export function corsPreflight(request: Request): Response {
  const headers = corsHeaders(request)
  if (!headers.has('Access-Control-Allow-Origin')) {
    return Response.json({ error: 'CORS_ORIGIN_NOT_ALLOWED' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(null, { status: 204, headers })
}
