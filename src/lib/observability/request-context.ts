import 'server-only'

import { randomUUID } from 'node:crypto'

export type RequestContext = {
  requestId: string
  traceId: string
  operation: string
  userId?: string
  tenantId?: string
  orderId?: string
  paymentId?: string
  eventId?: string
  provider?: string
  startedAt: number
}

export function createRequestContext(operation: string, headers?: Headers): RequestContext {
  const requestId = headers?.get('x-request-id')?.trim() || randomUUID()
  const traceId = headers?.get('x-trace-id')?.trim() || requestId
  return { requestId, traceId, operation, startedAt: Date.now() }
}

export function contextHeaders(context: RequestContext): Headers {
  const headers = new Headers()
  headers.set('x-request-id', context.requestId)
  headers.set('x-trace-id', context.traceId)
  return headers
}

export function finishContext(context: RequestContext, extra: Record<string, unknown> = {}) {
  return {
    request_id: context.requestId,
    trace_id: context.traceId,
    operation: context.operation,
    duration_ms: Date.now() - context.startedAt,
    ...extra,
  }
}
