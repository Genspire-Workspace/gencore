// file: packages\core\src\logging\logger.ts

import type { ILogEntry, LogLevel, LogStore } from "./log-store.js";

type LogFormat = "pretty" | "json";

interface INodeLikeProcess {
  cwd?: () => string;
  env?: Record<string, string | undefined>;
  stdout?: {
    isTTY?: boolean;
  };
}

interface IV8ErrorConstructor {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const LOG_LEVEL_COLORS: Record<
  LogLevel,
  {
    foreground: string;
    background: string;
  }
> = {
  debug: {
    foreground: "90",
    background: "100",
  },
  info: {
    foreground: "34",
    background: "44",
  },
  warn: {
    foreground: "33",
    background: "43",
  },
  error: {
    foreground: "31",
    background: "41",
  },
};

function isSensitiveKey(key: string): boolean {
  const normalized = key
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();

  return (
    /\bapi[_-]?key\b/.test(normalized) ||
    /\b(access|refresh|id)?[_-]?token\b/.test(normalized) ||
    /\bpassword\b/.test(normalized) ||
    /\bsecret\b/.test(normalized) ||
    /\bauthorization\b/.test(normalized)
  );
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);

    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[redacted]" : sanitizeValue(entry, seen);
    }
    return out;
  }

  return String(value);
}

function toErrorData(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  return { error: String(error) };
}

function readNodeProcess(): INodeLikeProcess | null {
  const candidate = (globalThis as { process?: INodeLikeProcess }).process;
  return candidate ?? null;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeStackFile(filePath: string): string {
  const normalized = filePath.replace(/^file:\/\//, "");
  const cwd = readNodeProcess()?.cwd?.();
  if (!cwd) {
    return normalized;
  }

  const normalizedFile = normalizeSlashes(normalized);
  const normalizedCwd = normalizeSlashes(cwd).replace(/\/+$/, "");
  const prefix = `${normalizedCwd}/`;

  if (normalizedFile === normalizedCwd) {
    return ".";
  }

  if (normalizedFile.startsWith(prefix)) {
    return normalizedFile.slice(prefix.length);
  }

  return normalized;
}

function parseStackLine(line: string): { file: string; line: string; column: string } | null {
  const trimmed = line.trim();
  const match =
    trimmed.match(/\((.+):(\d+):(\d+)\)$/) ??
    trimmed.match(/at (.+):(\d+):(\d+)$/);

  if (!match) {
    return null;
  }

  const [, file, lineNumber, columnNumber] = match;
  if (!file || !lineNumber || !columnNumber) {
    return null;
  }

  return {
    file: normalizeStackFile(file),
    line: lineNumber,
    column: columnNumber,
  };
}

function isApplicationStackFrame(line: string): boolean {
  return (
    !line.includes("/src/logging/logger.") &&
    !line.includes("\\src\\logging\\logger.") &&
    !line.includes("node:internal") &&
    !line.includes("internal/")
  );
}

function captureCallSite(): string | undefined {
  const holder: { stack?: string } = {};
  (Error as IV8ErrorConstructor).captureStackTrace?.(holder, captureCallSite);
  const stackLines = holder.stack?.split("\n").slice(1) ?? [];

  for (const line of stackLines) {
    if (!isApplicationStackFrame(line)) {
      continue;
    }

    const location = parseStackLine(line);
    if (location) {
      return `${location.file}:${location.line}:${location.column}`;
    }
  }

  return undefined;
}

function supportsAnsiColors(): boolean {
  const env = readNodeProcess()?.env ?? {};
  const stdout = readNodeProcess()?.stdout;

  if (env["NO_COLOR"]) {
    return false;
  }

  if (env["FORCE_COLOR"]) {
    return true;
  }

  if (env["COLORTERM"]) {
    return true;
  }

  if (env["TERM_PROGRAM"] === "vscode") {
    return true;
  }

  if (env["WT_SESSION"]) {
    return true;
  }

  if (env["ANSICON"]) {
    return true;
  }

  const term = env["TERM"]?.trim().toLowerCase() ?? "";
  if (term && term !== "dumb") {
    return true;
  }

  return Boolean(stdout?.isTTY);
}

function colorize(value: string, code: string, enabled: boolean): string {
  return enabled ? `\u001b[${code}m${value}\u001b[0m` : value;
}

function formatTimestamp(timestamp: string, level: LogLevel, enabled: boolean): string {
  return colorize(timestamp, LOG_LEVEL_COLORS[level].foreground, enabled);
}

function formatLevel(level: LogLevel, enabled: boolean): string {
  const { background } = LOG_LEVEL_COLORS[level];

  return colorize(` ${level.toUpperCase()} `, `1;37;${background}`, enabled);
}

function formatLogPrefix(entry: ILogEntry, enabled: boolean): string {
  return `${formatTimestamp(entry.timestamp, entry.level, enabled)} ${formatLevel(entry.level, enabled)}: `;
}

function formatData(data?: Record<string, unknown>): string[] {
  if (!data) {
    return [];
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    lines.push(`      ${key}: ${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`);
  }

  return lines;
}

function formatConsoleEntry(entry: ILogEntry, colorsEnabled: boolean): string {
  return [
    `${formatLogPrefix(entry, colorsEnabled)}${colorize(entry.category, "1", colorsEnabled)}${entry.source ? ` ${colorize(`[${entry.source}]`, "90", colorsEnabled)}` : ""}`,
    `      ${entry.message}`,
    ...formatData(entry.data),
  ].join("\n");
}

export class Logger {
  constructor(
    private readonly category: string,
    private readonly minLevel: LogLevel,
    private readonly format: LogFormat,
    private readonly colorsEnabled: boolean,
    private readonly store?: LogStore,
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.write("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.write("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.write("warn", message, data);
  }

  error(message: string, errorOrData?: unknown, data?: Record<string, unknown>): void {
    if (errorOrData instanceof Error) {
      this.write("error", message, {
        ...data,
        ...toErrorData(errorOrData),
      });
      return;
    }

    if (errorOrData && typeof errorOrData === "object" && !Array.isArray(errorOrData)) {
      this.write("error", message, errorOrData as Record<string, unknown>);
      return;
    }

    if (errorOrData !== undefined) {
      this.write("error", message, {
        ...data,
        error: String(errorOrData),
      });
      return;
    }

    this.write("error", message, data);
  }

  async run<T>(
    operation: string,
    action: () => T | Promise<T>,
    data?: Record<string, unknown>,
  ): Promise<T> {
    const startedAt = Date.now();
    this.info("Run started", { operation, ...data });

    try {
      const result = await action();
      this.info("Run completed", {
        operation,
        durationMs: Date.now() - startedAt,
        ...data,
      });
      return result;
    } catch (error) {
      this.error("Run failed", error, {
        operation,
        durationMs: Date.now() - startedAt,
        ...data,
      });
      throw error;
    }
  }

  private write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry: ILogEntry = {
      level,
      category: this.category,
      message,
      timestamp: new Date().toISOString(),
      source: captureCallSite(),
      data: data ? (sanitizeValue(data) as Record<string, unknown>) : undefined,
    };

    this.store?.add(entry);

    const payload =
      this.format === "json"
        ? JSON.stringify(entry)
        : formatConsoleEntry(entry, this.colorsEnabled);

    if (level === "warn") {
      console.warn(payload);
    } else if (level === "error") {
      console.error(payload);
    } else {
      console.log(payload);
    }
  }
}

export function normalizeLogLevel(value: string | undefined): LogLevel {
  switch (value?.trim().toLowerCase()) {
    case "debug":
    case "warn":
    case "error":
      return value.trim().toLowerCase() as LogLevel;
    case "info":
    default:
      return "info";
  }
}

export function normalizeLogFormat(value: string | undefined): LogFormat {
  return value?.trim().toLowerCase() === "json" ? "json" : "pretty";
}

export function normalizeLogColors(value: string | undefined): boolean {
  switch (value?.trim().toLowerCase()) {
    case "always":
      return true;
    case "never":
      return false;
    default:
      return supportsAnsiColors();
  }
}
