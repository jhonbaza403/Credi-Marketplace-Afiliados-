import "server-only";

import type { LogContext, LogLevel } from "./types";

export type { LogContext, LogLevel } from "./types";

function serializeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  });
}

function write(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const output = `${serializeLog(level, message, context)}\n`;

  if (level === "error" || level === "warn") {
    process.stderr.write(output);
    return;
  }

  process.stdout.write(output);
}

export const logger = {
  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },

  error(message: string, context?: LogContext): void {
    write("error", message, context);
  },
};
