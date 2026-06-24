import { Singleton } from "../container/decorators.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  timestamp: string;
  source?: string;
  data?: Record<string, unknown>;
}

@Singleton()
export class LogStore {
  private readonly entries: LogEntry[] = [];

  constructor(private readonly maxEntries = 500) {}

  add(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  list(limit = 200): readonly LogEntry[] {
    return this.entries.slice(-Math.max(1, limit));
  }

  clear(): void {
    this.entries.length = 0;
  }
}
