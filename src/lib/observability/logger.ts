```ts
// ==========================================================
// CREDI MARKETPLACE
// Structured Logger
// ==========================================================

type LogLevel =
  | "info"
  | "warn"
  | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  metadata?: unknown;
}

function serializePayload(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  };

  return `${JSON.stringify(payload)}\n`;
}

function writeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const output = serializePayload(
    level,
    message,
    context,
  );

  if (level === "error" || level === "warn") {
    process.stderr.write(output);
    return;
  }

  process.stdout.write(output);
}

export const logger = {
  info(
    message: string,
    context?: LogContext,
  ): void {
    writeLog(
      "info",
      message,
      context,
    );
  },

  warn(
    message: string,
    context?: LogContext,
  ): void {
    writeLog(
      "warn",
      message,
      context,
    );
  },

  error(
    message: string,
    context?: LogContext,
  ): void {
    writeLog(
      "error",
      message,
      context,
    );
  },
};
```
