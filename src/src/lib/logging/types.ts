export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  metadata?: unknown;
}
