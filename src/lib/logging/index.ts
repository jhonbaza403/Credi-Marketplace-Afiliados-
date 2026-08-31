import type { LogContext } from "./types";

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }));
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
