import type { ScopedContainer } from "@genspire/core";

export class HttpContextItems {
  private readonly values: Record<string, unknown>;

  constructor(initial?: Record<string, unknown>) {
    this.values = { ...(initial ?? {}) };
  }

  get<T = unknown>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.values[key] = value;
  }

  has(key: string): boolean {
    return key in this.values;
  }

  remove(key: string): void {
    delete this.values[key];
  }

  toObject(): Readonly<Record<string, unknown>> {
    return this.values;
  }
}

export interface HttpContext {
  req: Request;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  container: ScopedContainer;
  items: HttpContextItems;
}
