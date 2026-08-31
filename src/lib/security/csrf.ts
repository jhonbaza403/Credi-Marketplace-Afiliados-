export function getOrigin(
  request: Request,
): string | null {
  const origin = request.headers.get('origin')

  if (origin) {
    return origin
  }

  const referer =
    request.headers.get('referer')

  if (!referer) {
    return null
  }

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export function isSameOrigin(
  request: Request,
): boolean {
  const origin = getOrigin(request)

  if (!origin) {
    return true
  }

  const requestOrigin =
    new URL(request.url).origin

  return origin === requestOrigin
}

export function assertSameOrigin(
  request: Request,
): void {
  if (!isSameOrigin(request)) {
    throw new Error('CSRF_VALIDATION_FAILED')
  }
}
