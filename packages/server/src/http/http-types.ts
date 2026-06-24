// file: packages\server\src\http\http-types.ts

import type { HttpContext } from "../context/http-context.js";
import type { IRouteAuthorizationMetadata } from "../auth/route-authorization.js";

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

export interface HttpRouteDocs {
  summary?: string;
  description?: string;
  tags?: readonly string[];
  deprecated?: boolean;
  query?: unknown;
  requestBody?: unknown;
  request?: unknown;
  response?: unknown;
  responses?: Record<string | number, unknown | HttpResponseDoc>;
  authorization?: IRouteAuthorizationMetadata;
}

export interface HttpResponseDoc {
  description?: string;
  body?: unknown;
  contentType?: string;
}

export interface HttpRouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  docs?: HttpRouteDocs;
}
