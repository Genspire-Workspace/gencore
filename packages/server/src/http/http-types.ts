// file: packages\server\src\http\http-types.ts

import type { HttpContext } from "../context/http-context.js";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type RouteHandlerResult =
  | Response
  | string
  | object
  | null
  | undefined
  | Promise<Response | string | object | null | undefined>;

export type RouteHandler = (ctx: HttpContext) => RouteHandlerResult;

export interface HttpRouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}
