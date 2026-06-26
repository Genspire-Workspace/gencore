// file: apps\playground-api\src\ai\sessions\session-logger.ts

import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";

const SESSION_LOG_ROOT = path.resolve(
  import.meta.dirname,
  "../../../../../data/logs/sessions",
);

export interface ISessionLogger {
  readonly requestId: string;
  readonly sessionLogDir: string;
  append(fileName: string, message: string): void;
  appendJson(fileName: string, label: string, value: unknown): void;
}

function createRequestId(): string {
  return crypto.randomUUID();
}

export function createSessionLogger(sessionId: string): ISessionLogger {
  const sessionLogDir = path.join(SESSION_LOG_ROOT, sessionId);
  mkdirSync(sessionLogDir, { recursive: true });
  const requestId = createRequestId();

  return {
    requestId,
    sessionLogDir,

    append(fileName: string, message: string): void {
      try {
        appendFileSync(path.join(sessionLogDir, fileName), `${message}\n`);
      } catch {
        // Logging is best-effort; never break the request path.
      }
    },

    appendJson(fileName: string, label: string, value: unknown): void {
      try {
        const serialized = JSON.stringify(value, null, 2);
        appendFileSync(
          path.join(sessionLogDir, fileName),
          `[requestId=${requestId}] ${label}:\n${serialized}\n\n`,
        );
      } catch {
        // Logging is best-effort; never break the request path.
      }
    },
  };
}