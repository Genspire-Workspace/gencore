// file: packages\swagger\src\extension\swagger-extension.test.ts

import { describe, expect, test } from "bun:test";
import { createApp, LoggerFactory, LogStore } from "@genspire/core";
import { Controller, Get, serverExtension, Server } from "@genspire/server";
import { swaggerExtension } from "./swagger-extension.js";

@Controller("/todo", { tag: "Todo" })
class TodoDocsController {
  @Get("/:id", {
    summary: "Get todo",
  })
  async getById() {
    return { ok: true };
  }
}

describe("swaggerExtension", () => {
  test("registers /swagger.json and /docs", async () => {
    const app = createApp();
    await app.use(serverExtension({ port: 0 }));
    await app.use(swaggerExtension());

    const server = app.get(Server);
    server.registerController(TodoDocsController);

    const swaggerJson = await server.handle(new Request("http://localhost/swagger.json"));
    const docs = await server.handle(new Request("http://localhost/docs"));

    expect(swaggerJson.status).toBe(200);
    expect(docs.status).toBe(200);
    expect(docs.headers.get("content-type")).toContain("text/html");
  });

  test("swagger json includes converted todo path", async () => {
    const app = createApp();
    await app.use(serverExtension({ port: 0 }));
    await app.use(swaggerExtension());

    const server = app.get(Server);
    server.registerController(TodoDocsController);

    const response = await server.handle(new Request("http://localhost/swagger.json"));
    const document = await response.json() as {
      paths: Record<string, unknown>;
    };

    expect(document.paths["/todo/{id}"]).toBeDefined();
  });
});
