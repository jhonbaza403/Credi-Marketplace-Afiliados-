export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiFailure {
  const error = details === undefined ? { code, message } : { code, message, details };
  return { ok: false, error };
}

export function jsonResponse<T>(
  body: ApiResponse<T>,
  status = body.ok ? 200 : 400,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}
