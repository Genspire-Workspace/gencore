// file: apps/playground-app-ai/src/verify/shared/logger.ts

import { mkdirSync } from "node:fs";
import path from "node:path";

export interface IAppAiLogger {
  readonly logPath: string;
  log(message: string): void;
  close(): Promise<void>;
}

export interface IAppAiLoggerOptions {
  provider: string;
  filePrefix: string;
  logDir?: string;
}

export function createTimestamp(): string {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}

export function createAppAiLogger(options: IAppAiLoggerOptions): IAppAiLogger {
  const baseDir =
    options.logDir ??
    path.resolve(import.meta.dirname, "../../../../../data/logs/app-ai");
  const logDir = path.join(baseDir, options.provider);

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