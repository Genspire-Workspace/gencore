// file: packages\server\src\index.ts

export type { HttpContext, RequestContextInit } from "./context/http-context.js";
export { HttpContextItems, InvalidJsonBodyError, RequestContext } from "./context/http-context.js";

export { resolveClientIp } from "./ip/client-ip.js";
export type { IClientIpOptions, IResolvedClientIp } from "./ip/client-ip.js";

export {
  ApiDto,
  ApiField,
  apiArrayOf,
  apiDtoToTypeDefinition,
  apiTypeToOpenApiDefinition,
} from "./openapi/api-dto.js";
export { buildOpenApiDocument, inferPathParameters, toOpenApiPath } from "./openapi/openapi-builder.js";
export { createOpenApiDocument } from "./openapi/openapi-document.js";
export type {
  ApiDtoClass,
  ApiDtoFieldOptions,
  ApiDtoOptions,
  ApiSchemaInput,
  ApiSchemaThunk,
} from "./openapi/api-dto.js";
export type { ApiArrayTypeDefinition } from "./openapi/schema-helpers.js";
export { arrayOf, defineApiType } from "./openapi/schema-helpers.js";
export type { OpenApiDocument, OpenApiSchema, OpenApiTypeDefinition } from "./openapi/openapi-types.js";

export {
  AllowAnonymous,
  Authorize,
  Controller,
  Delete,
  Get,
  getMethodAuthMetadata,
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
  HttpResponseDoc,
  HttpRouteDefinition,
  HttpRouteDocs,
  RouteHandler,
  RouteHandlerResult,
} from "./http/http-types.js";

export type {
  IAuthorizationRequirement,
  IRouteAuthorizationMetadata,
} from "./auth/route-authorization.js";

export type { HttpMiddleware, HttpMiddlewareContext, NextHttpMiddleware } from "./middleware/middleware.js";
export { rateLimitMiddleware } from "./middleware/rate-limit.middleware.js";
export type { RateLimitOptions } from "./middleware/rate-limit.middleware.js";
export { InMemoryRateLimitStore } from "./middleware/rate-limit-store.js";
export type { IRateLimitBucket, IRateLimitStore } from "./middleware/rate-limit-store.js";

export { HttpError } from "./responses/http-error.js";
export type { HttpErrorOptions } from "./responses/http-error.js";
export type { ProblemDetails } from "./responses/problem-details.js";
export { defineProblemDetailsType } from "./openapi/problem-details.js";
export { json, noContent, problem, redirect, text } from "./responses/response-helpers.js";
export type { ProblemDetailsOptions } from "./responses/response-helpers.js";
export { toResponse } from "./responses/response-normalizer.js";

export { Router, RouterGroup } from "./routing/router.js";
export type { RegisteredRoute, RouteRegistrationOptions } from "./routing/router.js";

export { Server } from "./server/server.js";
export type { ServerCorsOptions, ServerOptions } from "./server/server.js";

export type { WebSocketContext, WebSocketRouteDefinition } from "./websocket/websocket-types.js";
