import { describe, expect, it } from 'vitest'
import {
  InvalidRequestBodyError,
  RequestBodyTooLargeError,
  readRequestBodyTextBounded,
} from '@/lib/security/request-body'

const encoder = new TextEncoder()

function closedStream(...chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

describe('bounded webhook request body reader', () => {
  it('reads UTF-8 request bodies within the byte limit', async () => {
    const body = closedStream(encoder.encode('{"event":"paid"}'))
    await expect(readRequestBodyTextBounded(body, null, 128)).resolves.toBe('{"event":"paid"}')
  })

  it('rejects an oversized Content-Length before reading the body', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })

    await expect(readRequestBodyTextBounded(body, '1024', 512)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
    expect(cancelled).toBe(true)
  })

  it('cancels the stream when actual bytes exceed the limit without Content-Length', async () => {
    let cancelled = false
    let chunkIndex = 0
    const chunks = [new Uint8Array(4), new Uint8Array(4)]
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunkIndex < chunks.length) controller.enqueue(chunks[chunkIndex++])
        else controller.close()
      },
      cancel() {
        cancelled = true
      },
    })

    await expect(readRequestBodyTextBounded(body, null, 5)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
    expect(cancelled).toBe(true)
  })

  it('rejects malformed Content-Length and invalid UTF-8', async () => {
    await expect(readRequestBodyTextBounded(closedStream(), '5x', 20)).rejects.toBeInstanceOf(InvalidRequestBodyError)
    await expect(readRequestBodyTextBounded(closedStream(new Uint8Array([0xff])), null, 20)).rejects.toBeInstanceOf(InvalidRequestBodyError)
  })

  it('allows an absent body to decode as empty text', async () => {
    await expect(readRequestBodyTextBounded(null, null, 10)).resolves.toBe('')
  })
})
