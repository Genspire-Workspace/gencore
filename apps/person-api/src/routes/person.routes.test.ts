import { describe, expect, test } from "bun:test";
import { createApp, LogStore, LoggerFactory } from "@genspire/core";
import { EntityManagerProvider } from "@genspire/data-mikroorm";
import { Server } from "@genspire/server";
import { registerPersonRoutes } from "./person.routes.js";

describe("person routes", () => {
  test("route registration compiles", () => {
    const app = createApp();
    const loggerFactory = new LoggerFactory(new LogStore());
    const server = new Server({
      container: app.container,
      loggerFactory,
    });

    app.provide(
      EntityManagerProvider,
      {
        fork() {
          return {
            find: async () => [],
            findOne: async () => null,
            create: () => ({}),
            persistAndFlush: async () => {},
            removeAndFlush: async () => {},
          };
        },
      } as unknown as EntityManagerProvider,
    );

    registerPersonRoutes(server, app);

    expect(server.listRoutes().map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      "DELETE /person/:id",
      "GET /health",
      "GET /person",
      "GET /person/:id",
      "POST /person",
    ]);
  });
});
