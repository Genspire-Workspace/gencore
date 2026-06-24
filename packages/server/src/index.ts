// file: packages\server\src\index.ts

export type { HttpContext, RequestContextInit } from "./context/http-context.js";
export { HttpContextItems, InvalidJsonBodyError, RequestContext } from "./context/http-context.js";

export {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
} from "./controllers/controller.js";
export {
  ensureControllerMetadata,
  getControllerMetadata,
  isController,
  setControllerLifetime,
} from "./controllers/controller-metadata.js";
export type {
  ControllerClass,
  ControllerMetadata,
  ControllerOptions,
  ControllerRouteDefinition,
} from "./controllers/controller-metadata.js";
export {
  registerControllerRoutes,
  registerControllers,
} from "./controllers/controller-registration.js";

export { serverExtension } from "./extension/server-extension.js";
export type { ServerExtensionOptions } from "./extension/server-extension.js";

export type {
  HttpMethod,
  HttpRouteDefinition,
  HttpRouteDocs,
  RouteHandler,
  RouteHandlerResult,
} from "./http/http-types.js";

export type { HttpMiddleware, HttpMiddlewareContext, NextHttpMiddleware } from "./middleware/middleware.js";

export { json, noContent, problem, redirect, text } from "./responses/response-helpers.js";
export type { ProblemDetailsOptions } from "./responses/response-helpers.js";
export { toResponse } from "./responses/response-normalizer.js";

export { Router, RouterGroup } from "./routing/router.js";
export type { RegisteredRoute, RouteRegistrationOptions } from "./routing/router.js";

export { Server } from "./server/server.js";
export type { ServerOptions } from "./server/server.js";

export type { WebSocketContext, WebSocketRouteDefinition } from "./websocket/websocket-types.js";
