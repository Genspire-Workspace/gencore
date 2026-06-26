// file: packages\server\src\middleware\rate-limit.middleware.ts

import type { HttpMiddleware } from "./middleware.js";
import { problem } from "../responses/response-helpers.js";
import {
  InMemoryRateLimitStore,
  type IRateLimitBucket,
  type IRateLimitStore,
} from "./rate-limit-store.js";

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  store?: IRateLimitStore;
  keyPrefix?: string;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;
const DEFAULT_MESSAGE = "Too many requests, please try again later.";

export function rateLimitMiddleware(options: RateLimitOptions = {}): HttpMiddleware {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const message = options.message ?? DEFAULT_MESSAGE;
  const store: IRateLimitStore = options.store ?? new InMemoryRateLimitStore();
  const keyPrefix = options.keyPrefix ?? "rl";

  return async ({ ctx, route }, next) => {
    const clientKey = ctx.clientIp ?? "__global__";
    const key = `${keyPrefix}::${clientKey}::${route.path}`;

    const bucket: IRateLimitBucket = await store.incr(key, windowMs);
    const remaining = Math.max(0, max - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetsAt - Date.now()) / 1000));

    if (bucket.count > max) {
      const response = problem({
        status: 429,
        title: "Too Many Requests",
        detail: message,
        code: "RATE_LIMIT_EXCEEDED",
      });

      const headers = new Headers(response.headers);
      headers.set("Retry-After", String(retryAfterSeconds));
      headers.set("X-RateLimit-Limit", String(max));
      headers.set("X-RateLimit-Remaining", "0");
      headers.set("X-RateLimit-Reset", String(Math.floor(bucket.resetsAt / 1000)));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const response = await next();

    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(max));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", String(Math.floor(bucket.resetsAt / 1000)));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}