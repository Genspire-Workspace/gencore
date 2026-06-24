// file: packages\server\src\middleware\middleware.ts

import type { HttpContext } from "../context/http-context.js";
import type { RegisteredRoute } from "../routing/router.js";

export interface HttpMiddlewareContext {
  ctx: HttpContext;
  route: RegisteredRoute;
}

export type NextHttpMiddleware = () => Promise<Response>;

export type HttpMiddleware = (
  context: HttpMiddlewareContext,
  next: NextHttpMiddleware,
) => Response | Promise<Response>;
