import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

const statusByCode: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export function requestIdFrom(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && /^[A-Za-z0-9._:-]{8,128}$/.test(value) ? value : crypto.randomUUID();
}

export function apiJson<T>(
  data: T,
  init: ResponseInit & { requestId?: string } = {},
): NextResponse<T> {
  const { requestId, headers, ...responseInit } = init;
  const merged = new Headers(headers);
  merged.set("Cache-Control", merged.get("Cache-Control") ?? "no-store");
  merged.set("X-Content-Type-Options", "nosniff");
  if (requestId) merged.set("X-Request-ID", requestId);
  return NextResponse.json(data, { ...responseInit, headers: merged });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  options: {
    requestId?: string;
    details?: unknown;
    retryAfterSeconds?: number;
  } = {},
): NextResponse {
  const status = statusByCode[code];
  const body: {
    error: { code: ApiErrorCode; message: string; request_id?: string; details?: unknown };
  } = {
    error: {
      code,
      message,
      ...(options.requestId ? { request_id: options.requestId } : {}),
      ...(options.details !== undefined ? { details: options.details } : {}),
    },
  };

  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  if (options.requestId) headers.set("X-Request-ID", options.requestId);
  if (options.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(Math.max(1, Math.floor(options.retryAfterSeconds))));
  }

  return NextResponse.json(body, { status, headers });
}

export function jsonRequestRequired(request: Request): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json");
}
