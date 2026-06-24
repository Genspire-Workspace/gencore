import { describe, expect, test } from "bun:test";
import { Container, LogStore, LoggerFactory } from "@genspire/core";
import type { HttpMiddleware } from "../middleware/middleware.js";
import { json, noContent, problem, redirect, text } from "../responses/response-helpers.js";
import { Server } from "./server.js";

function createServer(middlewares: readonly HttpMiddleware[] = []): Server {
  const container = new Container();
  const logStore = new LogStore();
  const loggerFactory = new LoggerFactory(logStore);

  container.registerInstance(LogStore, logStore);
  container.registerInstance(LoggerFactory, loggerFactory);

  return new Server({
    container,
    loggerFactory,
    middlewares,
  });
}

describe("@genspire/server", () => {
  test("GET route returns JSON object", async () => {
    const server = createServer();
    server.get("/health", () => ({ ok: true }));

    const response = await server.handle(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ ok: true });
  });

  test("route params work", async () => {
    const server = createServer();
    server.get("/hello/:name", (ctx) => ({ message: `Hello ${ctx.params.name}` }));

    const response = await server.handle(new Request("http://localhost/hello/Ada"));

    expect(await response.json()).toEqual({ message: "Hello Ada" });
  });

  test("query params work", async () => {
    const server = createServer();
    server.get("/search", (ctx) => ({ q: ctx.query.get("q") }));

    const response = await server.handle(new Request("http://localhost/search?q=genspire"));

    expect(await response.json()).toEqual({ q: "genspire" });
  });

  test("middleware order works", async () => {
    const calls: string[] = [];
    const middlewares: HttpMiddleware[] = [
      async ({ ctx }, next) => {
        calls.push("mw1:before");
        ctx.items.set("value", "from-mw1");
        const response = await next();
        calls.push("mw1:after");
        return response;
      },
      async ({ ctx }, next) => {
        calls.push(`mw2:before:${ctx.item("value")}`);
        const response = await next();
        calls.push("mw2:after");
        return response;
      },
    ];
    const server = createServer(middlewares);
    server.get("/flow", () => {
      calls.push("handler");
      return { ok: true };
    });

    const response = await server.handle(new Request("http://localhost/flow"));

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      "mw1:before",
      "mw2:before:from-mw1",
      "handler",
      "mw2:after",
      "mw1:after",
    ]);
  });

  test("string return becomes text response", async () => {
    const server = createServer();
    server.get("/plain", () => "hello");

    const response = await server.handle(new Request("http://localhost/plain"));

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("hello");
  });

  test("Response return passes through", async () => {
    const server = createServer();
    const expected = json({ created: true }, { status: 201 });
    server.get("/created", () => expected);

    const response = await server.handle(new Request("http://localhost/created"));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ created: true });
  });

  test("unmatched route returns 404", async () => {
    const server = createServer();

    const response = await server.handle(new Request("http://localhost/missing"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  test("thrown route error returns 500", async () => {
    const server = createServer();
    server.get("/boom", () => {
      throw new Error("boom");
    });

    const response = await server.handle(new Request("http://localhost/boom"));

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(await response.json()).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
  });

  test("request helpers work", async () => {
    const server = createServer([
      async ({ ctx }, next) => {
        ctx.items.set("request-id", "abc123");
        return await next();
      },
    ]);
    server.post("/echo/:id", async (ctx) => ({
      id: ctx.params.id,
      q: ctx.query.get("q"),
      header: ctx.header("x-demo"),
      item: ctx.item("request-id"),
      body: await ctx.json<{ ok: boolean }>(),
    }));

    const response = await server.handle(
      new Request("http://localhost/echo/42?q=yes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo": "demo",
        },
        body: JSON.stringify({ ok: true }),
      }),
    );

    expect(await response.json()).toEqual({
      id: "42",
      q: "yes",
      header: "demo",
      item: "abc123",
      body: { ok: true },
    });
  });

  test("response helpers produce expected responses", async () => {
    const jsonResponse = json({ ok: true }, { status: 201 });
    const textResponse = text("hello");
    const emptyResponse = noContent();
    const redirectResponse = redirect("http://localhost/next", 307);
    const problemResponse = problem({
      status: 400,
      title: "Bad Request",
      detail: "Missing field",
      extensions: { field: "name" },
    });

    expect(jsonResponse.status).toBe(201);
    expect(await jsonResponse.json()).toEqual({ ok: true });

    expect(textResponse.status).toBe(200);
    expect(await textResponse.text()).toBe("hello");

    expect(emptyResponse.status).toBe(204);
    expect(await emptyResponse.text()).toBe("");

    expect(redirectResponse.status).toBe(307);
    expect(redirectResponse.headers.get("location")).toBe("http://localhost/next");

    expect(problemResponse.status).toBe(400);
    expect(problemResponse.headers.get("content-type")).toContain("application/problem+json");
    expect(await problemResponse.json()).toEqual({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Missing field",
      field: "name",
    });
  });
});
