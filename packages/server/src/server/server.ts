// file: packages\server\src\server\server.ts

import type { Container } from "@genspire/core";
import { EnvService, LoggerFactory } from "@genspire/core";
import type { ControllerClass } from "../controllers/controller-metadata.js";
import { registerControllerRoutes, registerControllers as registerControllerGroup } from "../controllers/controller-registration.js";
import { InvalidJsonBodyError } from "../context/http-context.js";
import type { HttpRouteDocs, RouteHandler } from "../http/http-types.js";
import type { HttpMiddleware } from "../middleware/middleware.js";
import { problem } from "../responses/response-helpers.js";
import { Router } from "../routing/router.js";
import type { RegisteredRoute, RouteRegistrationOptions } from "../routing/router.js";

export interface ServerOptions {
  port?: number;
  container: Container;
  loggerFactory: LoggerFactory;
  middlewares?: readonly HttpMiddleware[];
}

export class Server {
  public readonly router: Router;
  private readonly port: number;
  private readonly middlewares: readonly HttpMiddleware[];
  private bunServer?: ReturnType<typeof Bun.serve>;

  constructor(private readonly config: ServerOptions) {
    this.router = new Router(config.container);
    this.middlewares = config.middlewares ?? [];
    const env = config.container.isRegistered(EnvService)
      ? config.container.resolve(EnvService)
      : new EnvService();
    this.port = config.port ?? env.getNumber("PORT", 3000) ?? 3000;
  }

  private normalizeRouteOptions(
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): RouteRegistrationOptions | undefined {
    if (!options) {
      return undefined;
    }

    if (
      "controllerClass" in options ||
      "controllerOptions" in options ||
      "handlerName" in options ||
      "hidden" in options ||
      "docs" in options
    ) {
      return options as RouteRegistrationOptions;
    }

    return {
      docs: options as HttpRouteDocs,
    };
  }

  private registerRoute(
    method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head",
    path: string,
    handler: RouteHandler,
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.router[method](path, handler, this.normalizeRouteOptions(options));
  }

  get(
    path: string,
    handler: Parameters<Router["get"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("get", path, handler, options);
  }

  post(
    path: string,
    handler: Parameters<Router["post"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("post", path, handler, options);
  }

  put(
    path: string,
    handler: Parameters<Router["put"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("put", path, handler, options);
  }

  patch(
    path: string,
    handler: Parameters<Router["patch"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("patch", path, handler, options);
  }

  delete(
    path: string,
    handler: Parameters<Router["delete"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("delete", path, handler, options);
  }

  options(
    path: string,
    handler: Parameters<Router["options"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("options", path, handler, options);
  }

  head(
    path: string,
    handler: Parameters<Router["head"]>[1],
    options?: HttpRouteDocs | RouteRegistrationOptions,
  ): void {
    this.registerRoute("head", path, handler, options);
  }

  group(prefix: string, register: Parameters<Router["group"]>[1]): void {
    this.router.group(prefix, register);
  }

  listRoutes(): readonly RegisteredRoute[] {
    return this.router.list();
  }

  private findRoute(method: RegisteredRoute["method"], path: string): RegisteredRoute | undefined {
    return this.router.list().find((route) => route.method === method && route.path === path);
  }

  registerController(controller: ControllerClass): void {
    registerControllerRoutes(this.router, this.config.container, controller);
  }

  registerControllers(...controllers: ControllerClass[]): void {
    registerControllerGroup(this.router, this.config.container, ...controllers);
  }

  async handle(req: Request): Promise<Response> {
    const logger = this.config.loggerFactory.createLogger("Server");

    try {
      return await this.router.handle(req, this.middlewares);
    } catch (error) {
      if (error instanceof InvalidJsonBodyError) {
        logger.warn("Invalid JSON request body", {
          method: req.method,
          url: req.url,
        });
        return problem({
          status: 400,
          title: "Invalid JSON body",
        });
      }

      logger.error("Unhandled request failure", error, {
        method: req.method,
        url: req.url,
      });
      return problem({
        status: 500,
        title: "Internal Server Error",
      });
    }
  }

  async start(): Promise<void> {
    if (this.bunServer) {
      return;
    }

    const logger = this.config.loggerFactory.createLogger("Server");

    this.bunServer = Bun.serve({
      port: this.port,
      fetch: async (req) => await this.handle(req),
    });

    const actualPort = this.bunServer.port;
    const baseUrl = `http://localhost:${actualPort}`;
    const swaggerUiRoute = this.findRoute("GET", "/docs");
    const swaggerJsonRoute = this.findRoute("GET", "/swagger.json");

    logger.info("Server started", { port: actualPort });

    if (swaggerUiRoute) {
      logger.info("Swagger UI available", {
        url: `${baseUrl}${swaggerUiRoute.path}`,
      });
    }

    if (swaggerJsonRoute) {
      logger.info("OpenAPI document available", {
        url: `${baseUrl}${swaggerJsonRoute.path}`,
      });
    }
  }

  async stop(closeActiveConnections = true): Promise<void> {
    if (!this.bunServer) {
      return;
    }

    this.bunServer.stop(closeActiveConnections);
    this.bunServer = undefined;
    this.config.loggerFactory.createLogger("Server").info("Server stopped", {
      closeActiveConnections,
    });
  }
}
