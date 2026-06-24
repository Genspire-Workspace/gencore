// file: packages\server\src\server\server.ts

import type { Container } from "@genspire/core";
import { EnvService, LoggerFactory } from "@genspire/core";
import { InvalidJsonBodyError } from "../context/http-context.js";
import type { HttpMiddleware } from "../middleware/middleware.js";
import { problem } from "../responses/response-helpers.js";
import { Router } from "../routing/router.js";
import type { RegisteredRoute } from "../routing/router.js";

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

  get(path: string, handler: Parameters<Router["get"]>[1]): void {
    this.router.get(path, handler);
  }

  post(path: string, handler: Parameters<Router["post"]>[1]): void {
    this.router.post(path, handler);
  }

  put(path: string, handler: Parameters<Router["put"]>[1]): void {
    this.router.put(path, handler);
  }

  patch(path: string, handler: Parameters<Router["patch"]>[1]): void {
    this.router.patch(path, handler);
  }

  delete(path: string, handler: Parameters<Router["delete"]>[1]): void {
    this.router.delete(path, handler);
  }

  options(path: string, handler: Parameters<Router["options"]>[1]): void {
    this.router.options(path, handler);
  }

  head(path: string, handler: Parameters<Router["head"]>[1]): void {
    this.router.head(path, handler);
  }

  group(prefix: string, register: Parameters<Router["group"]>[1]): void {
    this.router.group(prefix, register);
  }

  listRoutes(): readonly RegisteredRoute[] {
    return this.router.list();
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

    logger.info("Server started", { port: this.port });
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
