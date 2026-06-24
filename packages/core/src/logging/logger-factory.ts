// file: packages\core\src\logging\logger-factory.ts

import { Singleton, inject } from "../container/decorators.js";
import { Logger, normalizeLogColors, normalizeLogFormat, normalizeLogLevel } from "./logger.js";
import { LogStore } from "./log-store.js";

@Singleton()
export class LoggerFactory {
  constructor(private readonly store?: LogStore) {}

  createLogger(category: string | Function): Logger {
    return new Logger(
      typeof category === "string" ? category : category.name || "Anonymous",
      normalizeLogLevel(process.env["LOG_LEVEL"]),
      normalizeLogFormat(process.env["LOG_FORMAT"]),
      normalizeLogColors(process.env["LOG_COLORS"]),
      this.store,
    );
  }
}

export function injectLogger(category: string | Function): Logger {
  return inject(LoggerFactory).createLogger(category);
}
