// file: apps\playground-ai\shared\verify-logger.ts

import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  IAiVerifyLogger,
  IAiVerifyLogOptions,
} from "./verify-types.js";

export function createTimestamp(): string {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}

export function createAiVerifyLogger(
  options: IAiVerifyLogOptions,
): IAiVerifyLogger {
  const logDir = path.resolve(
    import.meta.dirname,
    "../../../data/logs/ai-verification",
    options.suite,
  );

  mkdirSync(logDir, { recursive: true });

  const logPath = path.join(
    logDir,
    `${options.filePrefix}-${createTimestamp()}.log`,
  );

  const writer = Bun.file(logPath).writer();

  return {
    logPath,

    log(message: string): void {
      console.log(message);
      writer.write(`${message}\n`);
    },

    async close(): Promise<void> {
      await writer.end();
    },
  };
}
