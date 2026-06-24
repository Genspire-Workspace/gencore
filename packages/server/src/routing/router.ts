// file: packages\server\src\routing\router.ts

import type { Container } from "@genspire/core";
import { LoggerFactory } from "@genspire/core";
import { HttpContextItems, RequestContext, type HttpContext } from "../context/http-context.js";
import type { HttpMethod, RouteHandler } from "../http/http-types.js";
import type { HttpMiddleware } from "../middleware/middleware.js";
import { toResponse } from "../responses/response-normalizer.js";

export interface RegisteredRoute {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

interface RouteMatch {
  route: RegisteredRoute;
  params: Record<string, string>;
  url: URL;
}

function normalizePath(path: string): string {
  const normalized = `/${path}`.replace(/\/+/g, "/");
  return normalized === "/" ? normalized : normalized.replace(/\/$/, "");
}

function joinPaths(base: string, path: string): string {
  return normalizePath(`${base}/${path}`);
}

function matchPath(routePath: string, actualPath: string): Record<string, string> | null {
  const routeParts = routePath.split("/").filter(Boolean);
  const actualParts = actualPath.split("/").filter(Boolean);

  if (routeParts.length !== actualParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const actualPart = actualParts[index];

    if (!routePart || !actualPart) {
      return null;
    }

    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }

    if (routePart !== actualPart) {
      return null;
    }
  }

  return params;
}

function countStaticSegments(path: string): number {
  return path
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith(":")).length;
}

function compareSpecificity(left: RegisteredRoute, right: RegisteredRoute): number {
  const staticDifference = countStaticSegments(right.path) - countStaticSegments(left.path);
  if (staticDifference !== 0) {
    return staticDifference;
  }

  return right.path.length - left.path.length;
}

export class Router {
  private readonly routes: RegisteredRoute[] = [];

  constructor(private readonly container: Container) {}

  add(method: HttpMethod, path: string, handler: RouteHandler): void {
    this.routes.push({
      method,
      path: normalizePath(path),
      handler,
    });
    this.routes.sort(compareSpecificity);
  }

  get(path: string, handler: RouteHandler): void {
    this.add("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.add("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.add("PUT", path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.add("PATCH", path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.add("DELETE", path, handler);
  }

  options(path: string, handler: RouteHandler): void {
    this.add("OPTIONS", path, handler);
  }

  head(path: string, handler: RouteHandler): void {
    this.add("HEAD", path, handler);
  }

  group(prefix: string, register: (routes: RouterGroup) => void): void {
    register(new RouterGroup(this, normalizePath(prefix)));
  }

  list(): readonly RegisteredRoute[] {
    return this.routes;
  }

  match(req: Request): RouteMatch | null {
    const url = new URL(req.url);
    const method = req.method as HttpMethod;

    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const params = matchPath(route.path, url.pathname);
      if (params) {
        return { route, params, url };
      }
    }

    return null;
  }

  async handle(
    req: Request,
    middlewares: readonly HttpMiddleware[] = [],
    items?: Record<string, unknown>,
  ): Promise<Response> {
    const match = this.match(req);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const scope = this.container.createScope();
    const logger = this.container.resolve(LoggerFactory).createLogger("HttpRouter");
    const ctx: HttpContext = new RequestContext({
      req,
      url: match.url,
      params: match.params,
      query: match.url.searchParams,
      container: scope,
      items: new HttpContextItems(items),
    });
    const startedAt = Date.now();

    try {
      const invoke = async (index: number): Promise<Response> => {
        const middleware = middlewares[index];
        if (!middleware) {
          return toResponse(await match.route.handler(ctx));
        }

        return await middleware({ ctx, route: match.route }, async () => invoke(index + 1));
      };

      const response = await invoke(0);
      logger.info("Request completed", {
        method: req.method,
        path: match.url.pathname,
        route: `${match.route.method} ${match.route.path}`,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      logger.error("Request failed", error, {
        method: req.method,
        path: match.url.pathname,
        route: `${match.route.method} ${match.route.path}`,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      await scope.destroy();
    }
  }
}

export class RouterGroup {
  constructor(
    private readonly router: Router,
    private readonly prefix: string,
  ) {}

  get(path: string, handler: RouteHandler): void {
    this.router.get(joinPaths(this.prefix, path), handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.router.post(joinPaths(this.prefix, path), handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.router.put(joinPaths(this.prefix, path), handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.router.patch(joinPaths(this.prefix, path), handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.router.delete(joinPaths(this.prefix, path), handler);
  }

  options(path: string, handler: RouteHandler): void {
    this.router.options(joinPaths(this.prefix, path), handler);
  }

  head(path: string, handler: RouteHandler): void {
    this.router.head(joinPaths(this.prefix, path), handler);
  }
}
