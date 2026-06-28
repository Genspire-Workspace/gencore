// file: packages\server\src\server\server.ts

import type { Container } from "@genspire/core";
import { EnvService, GenError, LoggerFactory } from "@genspire/core";
import type { ControllerClass } from "../controllers/controller-metadata.js";
import { registerControllerRoutes, registerControllers as registerControllerGroup } from "../controllers/controller-registration.js";
import { InvalidJsonBodyError } from "../context/http-context.js";
import type { HttpRouteDocs, RouteHandler } from "../http/http-types.js";
import type { HttpMiddleware } from "../middleware/middleware.js";
import { HttpError } from "../responses/http-error.js";
import { problem } from "../responses/response-helpers.js";
import { Router, RouterGroup } from "../routing/router.js";
import type { RegisteredRoute, RouteRegistrationOptions } from "../routing/router.js";
import { type IClientIpOptions, resolveClientIp } from "../ip/client-ip.js";

export interface ServerOptions {
  port?: number;
  idleTimeout?: number;
  container: Container;
  loggerFactory: LoggerFactory;
  middlewares?: readonly HttpMiddleware[];
  clientIp?: IClientIpOptions;
  trustProxy?: boolean;
  cors?: ServerCorsOptions;
}

export interface ServerCorsOptions {
  origin?: string | readonly string[] | ((origin: string | null) => boolean);
  methods?: readonly string[];
  headers?: readonly string[];
  exposedHeaders?: readonly string[];
  credentials?: boolean;
  maxAge?: number;
}

export class Server {
  public readonly router: Router;
  private readonly port: number;
  private readonly middlewares: readonly HttpMiddleware[];
  private bunServer?: ReturnType<typeof Bun.serve>;
  private readonly routePrefixStack: string[] = [];

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
    this.router[method](
      this.applyCurrentPrefix(path),
      handler,
      this.normalizeRouteOptions(options),
    );
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
    this.routePrefixStack.push(prefix);
    try {
      register(new RouterGroup(this.router, this.currentPrefix()));
    } finally {
      this.routePrefixStack.pop();
    }
  }

  listRoutes(): readonly RegisteredRoute[] {
    return this.router.list();
  }

  private findRoute(method: RegisteredRoute["method"], path: string): RegisteredRoute | undefined {
    return this.router.list().find((route) => route.method === method && route.path === path);
  }

  registerController(controller: ControllerClass): void {
    registerControllerRoutes(
      this.router,
      this.config.container,
      controller,
      this.currentPrefix(),
    );
  }

  registerControllers(...controllers: ControllerClass[]): void {
    registerControllerGroup(
      this.router,
      this.config.container,
      this.currentPrefix(),
      ...controllers,
    );
  }

  private currentPrefix(): string {
    return this.routePrefixStack.join("");
  }

  private applyCurrentPrefix(path: string): string {
    const prefix = this.currentPrefix();
    if (!prefix) {
      return path;
    }

    return `${prefix}/${path}`.replace(/\/+/g, "/");
  }

  private resolveClientIpConfig(): IClientIpOptions {
    if (this.config.clientIp) {
      return this.config.clientIp;
    }
    return { trustProxy: this.config.trustProxy ?? false };
  }

  private resolveCorsOrigin(requestOrigin: string | null): string | null {
    const cors = this.config.cors;
    const originPolicy = cors?.origin;
    if (!originPolicy) {
      return null;
    }

    if (typeof originPolicy === "string") {
      return originPolicy === "*" || originPolicy === requestOrigin
        ? originPolicy
        : null;
    }

    if (Array.isArray(originPolicy)) {
      return requestOrigin && originPolicy.includes(requestOrigin)
        ? requestOrigin
        : null;
    }

    if (typeof originPolicy === "function") {
      return originPolicy(requestOrigin) ? (requestOrigin ?? "*") : null;
    }

    return null;
  }

  private applyCorsHeaders(request: Request, response: Response): Response {
    const cors = this.config.cors;
    if (!cors) {
      return response;
    }

    const requestOrigin = request.headers.get("origin");
    const allowedOrigin = this.resolveCorsOrigin(requestOrigin);
    if (!allowedOrigin) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowedOrigin);

    if (allowedOrigin !== "*") {
      headers.append("Vary", "Origin");
    }

    if (cors.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    if (cors.exposedHeaders && cors.exposedHeaders.length > 0) {
      headers.set("Access-Control-Expose-Headers", cors.exposedHeaders.join(", "));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  private handleCorsPreflight(request: Request): Response | null {
    const cors = this.config.cors;
    if (!cors || request.method !== "OPTIONS") {
      return null;
    }

    const requestOrigin = request.headers.get("origin");
    const requestMethod = request.headers.get("access-control-request-method");
    if (!requestOrigin || !requestMethod) {
      return null;
    }

    const allowedOrigin = this.resolveCorsOrigin(requestOrigin);
    if (!allowedOrigin) {
      return new Response(null, { status: 403 });
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.append("Vary", "Origin");
    headers.append("Vary", "Access-Control-Request-Method");
    headers.append("Vary", "Access-Control-Request-Headers");

    const allowedMethods = cors.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
    headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));

    const requestedHeaders = request.headers.get("access-control-request-headers");
    const allowedHeaders = cors.headers?.join(", ") ?? requestedHeaders ?? "Content-Type, Authorization";
    headers.set("Access-Control-Allow-Headers", allowedHeaders);

    if (cors.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    if (typeof cors.maxAge === "number" && Number.isFinite(cors.maxAge)) {
      headers.set("Access-Control-Max-Age", String(cors.maxAge));
    }

    return new Response(null, {
      status: 204,
      headers,
    });
  }

  async handle(req: Request): Promise<Response> {
    const logger = this.config.loggerFactory.createLogger("Server");
    const preflightResponse = this.handleCorsPreflight(req);
    if (preflightResponse) {
      return preflightResponse;
    }

    try {
      const clientIpOptions = this.resolveClientIpConfig();
      const resolvedIp = resolveClientIp(req, clientIpOptions);
      const response = await this.router.handle(req, this.middlewares, undefined, resolvedIp);
      return this.applyCorsHeaders(req, response);
    } catch (error) {
      if (error instanceof InvalidJsonBodyError) {
        logger.warn("Invalid JSON request body", {
          method: req.method,
          url: req.url,
        });
        return this.applyCorsHeaders(req, problem({
          status: 400,
          title: "Invalid JSON body",
        }));
      }

      const mappedError = this.mapErrorToProblemDetails(error);

      logger.error("Unhandled request failure", error, {
        method: req.method,
        url: req.url,
      });
      return this.applyCorsHeaders(req, problem(mappedError));
    }
  }

  private isValidationLikeCode(code: string | undefined): boolean {
    if (!code) {
      return false;
    }

    const normalized = code.toUpperCase();
    return normalized.includes("VALIDATION") || normalized.includes("INVALID");
  }

  private readNumericStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const candidate = (error as { status?: unknown; statusCode?: unknown }).status
      ?? (error as { status?: unknown; statusCode?: unknown }).statusCode;

    return typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : undefined;
  }

  private mapErrorToProblemDetails(error: unknown): {
    status: number;
    title: string;
    detail?: string;
    code?: string;
    errors?: Record<string, string[]>;
  } {
    if (error instanceof GenError && this.isValidationLikeCode(error.code)) {
      return {
        status: 400,
        title: "Bad Request",
        detail: error.message,
        code: error.code,
        errors: this.extractValidationErrors(error.details),
      };
    }

    if (error instanceof HttpError) {
      return {
        status: error.status,
        title: error.message,
        detail: error.detail ?? error.message,
        code: error.code,
        errors: error.errors,
      };
    }

    const explicitStatus = this.readNumericStatus(error);
    if (explicitStatus !== undefined) {
      const message = error instanceof Error ? error.message : "Request failed";
      const title = explicitStatus >= 500 ? "Internal Server Error" : message;

      return {
        status: explicitStatus,
        title,
        ...(explicitStatus >= 500 ? {} : { detail: message }),
        ...(this.readErrorCode(error) ? { code: this.readErrorCode(error) } : {}),
        ...(this.extractValidationErrors(this.readErrorDetails(error)) ? {
          errors: this.extractValidationErrors(this.readErrorDetails(error)),
        } : {}),
      };
    }

    return {
      status: 500,
      title: "Internal Server Error",
    };
  }

  private readErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  private readErrorDetails(error: unknown): Record<string, unknown> | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const details = (error as { details?: unknown }).details;
    return details && typeof details === "object"
      ? details as Record<string, unknown>
      : undefined;
  }

  private extractValidationErrors(
    details: Record<string, unknown> | undefined,
  ): Record<string, string[]> | undefined {
    const candidate = details?.["errors"];
    if (!candidate || typeof candidate !== "object") {
      return undefined;
    }

    const normalized: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(candidate as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        normalized[key] = value.filter((entry): entry is string => typeof entry === "string");
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  async start(): Promise<void> {
    if (this.bunServer) {
      return;
    }

    const logger = this.config.loggerFactory.createLogger("Server");

    this.bunServer = Bun.serve({
      port: this.port,
      ...(this.config.idleTimeout !== undefined
        ? { idleTimeout: this.config.idleTimeout }
        : {}),
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
