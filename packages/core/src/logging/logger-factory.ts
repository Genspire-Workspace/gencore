// file: packages\core\src\logging\logger-factory.ts

import { Singleton, inject } from "../container/decorators.js";
import { Logger, normalizeLogColors, normalizeLogFormat, normalizeLogLevel } from "./logger.js";
import { LogStore } from "./log-store.js";

function readProcessEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

@Singleton()
export class LoggerFactory {
  constructor(private readonly store?: LogStore) {}

  createLogger(category: string | Function): Logger {
    const env = readProcessEnv();

    return new Logger(
      typeof category === "string" ? category : category.name || "Anonymous",
      normalizeLogLevel(env["LOG_LEVEL"]),
      normalizeLogFormat(env["LOG_FORMAT"]),
      normalizeLogColors(env["LOG_COLORS"]),
      this.store,
    );
  }
}

export function injectLogger(category: string | Function): Logger {
  return inject(LoggerFactory).createLogger(category);
}
