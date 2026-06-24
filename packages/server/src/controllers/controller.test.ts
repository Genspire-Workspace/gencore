// file: packages\server\src\controllers\controller.test.ts

import { describe, expect, test } from "bun:test";
import { Container, LoggerFactory, LogStore, Singleton } from "@genspire/core";
import { Controller, Get, getControllerMetadata } from "./controller.js";
import { Server } from "../server/server.js";

@Singleton()
class GreetingService {
  greet(name: string): string {
    return `Hello ${name}`;
  }
}

@Controller("/hello", {
  tag: "Greeting",
  description: "Greeting endpoints",
})
class GreetingController {
  static inject = [GreetingService];

  constructor(private readonly service: GreetingService) {}

  @Get("/:name", {
    summary: "Say hello",
  })
  async greet(ctx: import("../context/http-context.js").HttpContext) {
    const name = ctx.params.name ?? "";

    return {
      message: this.service.greet(name),
    };
  }
}

describe("server controllers", () => {
  test("controller metadata is created", () => {
    const metadata = getControllerMetadata(GreetingController);

    expect(metadata.basePath).toBe("/hello");
    expect(metadata.options?.tag).toBe("Greeting");
    expect(metadata.httpRoutes).toHaveLength(1);
  });

  test("method decorators register routes", () => {
    const metadata = getControllerMetadata(GreetingController);

    expect(metadata.httpRoutes[0]).toMatchObject({
      method: "GET",
      path: "/:name",
      handlerName: "greet",
    });
  });

  test("server.registerController() registers routes", () => {
    const container = new Container();
    const loggerFactory = new LoggerFactory(new LogStore());
    const server = new Server({ container, loggerFactory });

    server.registerController(GreetingController);

    expect(server.listRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /hello/:name",
    ]);
  });

  test("controller route can be invoked with server.handle()", async () => {
    const container = new Container();
    const loggerFactory = new LoggerFactory(new LogStore());
    container.registerInstance(LoggerFactory, loggerFactory);
    const server = new Server({ container, loggerFactory });

    server.registerController(GreetingController);

    const response = await server.handle(new Request("http://localhost/hello/Ada"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Hello Ada",
    });
  });

  test("controller can inject a service through DI", async () => {
    const container = new Container();
    const loggerFactory = new LoggerFactory(new LogStore());
    container.registerInstance(LoggerFactory, loggerFactory);
    const server = new Server({ container, loggerFactory });

    server.registerController(GreetingController);

    const response = await server.handle(new Request("http://localhost/hello/Grace"));

    expect(await response.json()).toEqual({
      message: "Hello Grace",
    });
  });
});
