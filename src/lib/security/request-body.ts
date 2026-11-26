export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('REQUEST_BODY_TOO_LARGE')
    this.name = 'RequestBodyTooLargeError'
  }
}

export class InvalidRequestBodyError extends Error {
  constructor() {
    super('INVALID_REQUEST_BODY')
    this.name = 'InvalidRequestBodyError'
  }
}

/**
 * Reads a request stream under a strict byte budget. Content-Length is an
 * early rejection hint only; the streamed byte count is always enforced.
 */
export async function readRequestBodyTextBounded(
  body: ReadableStream<Uint8Array> | null,
  contentLength: string | null,
  maxBytes: number,
): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError('INVALID_MAX_REQUEST_BODY_BYTES')
  }

  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      throw new InvalidRequestBodyError()
    }

    const declaredBytes = Number(contentLength)
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxBytes) {
      try {
        await body?.cancel('request body exceeds the configured limit')
      } catch {
        // A runtime may already have cancelled or locked the request stream.
      }
      throw new RequestBodyTooLargeError()
    }
  }

  if (!body) return ''

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel('request body exceeds the configured limit')
        } catch {
          // The request is still rejected if stream cancellation itself fails.
        }
        throw new RequestBodyTooLargeError()
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new InvalidRequestBodyError()
  }
}
