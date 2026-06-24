// file: packages\server\src\context\http-context.ts

import type { ScopedContainer } from "@genspire/core";

export class InvalidJsonBodyError extends Error {
  public override readonly cause?: unknown;

  constructor(message = "Invalid JSON body", cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "InvalidJsonBodyError";
    this.cause = cause;
  }
}

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

export interface RequestContextInit {
  req: Request;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  container: ScopedContainer;
  items?: HttpContextItems;
}

export class RequestContext {
  public readonly req: Request;
  public readonly url: URL;
  public readonly params: Record<string, string>;
  public readonly query: URLSearchParams;
  public readonly container: ScopedContainer;
  public readonly items: HttpContextItems;

  constructor(init: RequestContextInit) {
    this.req = init.req;
    this.url = init.url;
    this.params = init.params;
    this.query = init.query;
    this.container = init.container;
    this.items = init.items ?? new HttpContextItems();
  }

  async json<T>(): Promise<T> {
    try {
      return await this.req.json() as T;
    } catch (error) {
      throw new InvalidJsonBodyError("Invalid JSON body", error);
    }
  }

  async text(): Promise<string> {
    return await this.req.text();
  }

  header(name: string): string | null {
    return this.req.headers.get(name);
  }

  item<T = unknown>(key: string): T | undefined {
    return this.items.get<T>(key);
  }
}

export type HttpContext = RequestContext;
