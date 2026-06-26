// file: packages\server\src\middleware\rate-limit.middleware.test.ts

import { describe, expect, test } from "bun:test";
import { Container, LogStore, LoggerFactory } from "@genspire/core";
import type { IRateLimitBucket, IRateLimitStore } from "./rate-limit-store.js";
import { InMemoryRateLimitStore } from "./rate-limit-store.js";
import type { HttpMiddleware } from "./middleware.js";
import { rateLimitMiddleware } from "./rate-limit.middleware.js";
import { Server } from "../server/server.js";

function createServer(
  middlewares: readonly HttpMiddleware[],
  options?: { trustProxy?: boolean },
): Server {
  const container = new Container();
  const logStore = new LogStore();
  const loggerFactory = new LoggerFactory(logStore);

  container.registerInstance(LogStore, logStore);
  container.registerInstance(LoggerFactory, loggerFactory);

  return new Server({
    container,
    loggerFactory,
    middlewares,
    trustProxy: options?.trustProxy ?? false,
  });
}

function requestWithIp(path: string, ip: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimitMiddleware", () => {
  test("allows requests up to max then returns 429", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 3 })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    const r1 = await server.handle(requestWithIp("/limited", "1.1.1.1"));
    const r2 = await server.handle(requestWithIp("/limited", "1.1.1.1"));
    const r3 = await server.handle(requestWithIp("/limited", "1.1.1.1"));
    const r4 = await server.handle(requestWithIp("/limited", "1.1.1.1"));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r4.status).toBe(429);
    expect(r4.headers.get("content-type")).toContain("application/problem+json");

    const body = (await r4.json()) as Record<string, unknown>;
    expect(body["code"]).toBe("RATE_LIMIT_EXCEEDED");
    expect(body["status"]).toBe(429);
  });

  test("429 response includes rate-limit headers", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 1 })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    await server.handle(requestWithIp("/limited", "2.2.2.2"));
    const blocked = await server.handle(requestWithIp("/limited", "2.2.2.2"));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  test("successful responses include rate-limit headers and remaining decrements", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 5 })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    const r1 = await server.handle(requestWithIp("/limited", "3.3.3.3"));
    const r2 = await server.handle(requestWithIp("/limited", "3.3.3.3"));

    expect(r1.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(r1.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(r2.headers.get("X-RateLimit-Remaining")).toBe("3");
  });

  test("limits are independent per route", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 1 })], {
      trustProxy: true,
    });
    server.get("/a", () => ({ ok: true }));
    server.get("/b", () => ({ ok: true }));

    const a1 = await server.handle(requestWithIp("/a", "4.4.4.4"));
    const a2 = await server.handle(requestWithIp("/a", "4.4.4.4"));
    const b1 = await server.handle(requestWithIp("/b", "4.4.4.4"));

    expect(a1.status).toBe(200);
    expect(a2.status).toBe(429);
    expect(b1.status).toBe(200);
  });

  test("limits are independent per client IP", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 1 })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    const ip1 = await server.handle(requestWithIp("/limited", "5.5.5.5"));
    const ip2 = await server.handle(requestWithIp("/limited", "6.6.6.6"));

    expect(ip1.status).toBe(200);
    expect(ip2.status).toBe(200);
  });

  test("window resets after windowMs elapses", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 100, max: 1 })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    const first = await server.handle(requestWithIp("/limited", "7.7.7.7"));
    const blocked = await server.handle(requestWithIp("/limited", "7.7.7.7"));
    expect(first.status).toBe(200);
    expect(blocked.status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const afterReset = await server.handle(requestWithIp("/limited", "7.7.7.7"));
    expect(afterReset.status).toBe(200);
  });

  test("unknown client IP still gets limited via global fallback", async () => {
    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 1 })], {
      trustProxy: false,
    });
    server.get("/limited", () => ({ ok: true }));

    const r1 = await server.handle(new Request("http://localhost/limited"));
    const r2 = await server.handle(new Request("http://localhost/limited"));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(429);
  });

  test("uses provided pluggable store", async () => {
    const calls: string[] = [];
    const store: IRateLimitStore = {
      incr(key: string, _windowMs: number): IRateLimitBucket {
        calls.push(key);
        return { count: calls.length, resetsAt: Date.now() + 1000 };
      },
      reset(): void {},
      resetAll(): void {},
    };

    const server = createServer([rateLimitMiddleware({ windowMs: 60_000, max: 100, store })], {
      trustProxy: true,
    });
    server.get("/limited", () => ({ ok: true }));

    await server.handle(requestWithIp("/limited", "8.8.8.8"));

    expect(calls.length).toBe(1);
    expect(calls[0]).toContain("8.8.8.8");
    expect(calls[0]).toContain("/limited");
  });

  test("InMemoryRateLimitStore counts within a window and resets", () => {
    const store = new InMemoryRateLimitStore();

    const b1 = store.incr("k", 1000);
    const b2 = store.incr("k", 1000);
    const b3 = store.incr("k", 1000);

    expect(b1.count).toBe(1);
    expect(b2.count).toBe(2);
    expect(b3.count).toBe(3);
    expect(b1.resetsAt).toBe(b3.resetsAt);

    store.reset("k");
    const afterReset = store.incr("k", 1000);
    expect(afterReset.count).toBe(1);
  });
});