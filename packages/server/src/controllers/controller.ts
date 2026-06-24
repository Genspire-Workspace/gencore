// file: packages\server\src\controllers\controller.ts

import type { HttpMethod, HttpRouteDocs } from "../http/http-types.js";
import type {
  ControllerClass,
  ControllerMetadata,
  ControllerOptions,
} from "./controller-metadata.js";
import {
  ensureControllerMetadata,
  getControllerMetadata,
  getControllerStage3Metadata,
  setControllerLifetime,
} from "./controller-metadata.js";
import type { IAuthorizationRequirement, IRouteAuthorizationMetadata } from "../auth/route-authorization.js";

const CONTROLLER_ROUTE_METADATA = Symbol.for("genspire.server.controller.route");
const METHOD_AUTH_METADATA = Symbol.for("genspire.server.method.authorization");

function addHttpRoute(
  metadata: ControllerMetadata,
  method: HttpMethod,
  path: string,
  handlerName: string,
  docs?: HttpRouteDocs,
): void {
  const route = {
    method,
    path,
    handlerName,
    docs,
  };
  const existingIndex = metadata.httpRoutes.findIndex(
    (candidate) =>
      candidate.method === route.method &&
      candidate.path === route.path &&
      candidate.handlerName === route.handlerName,
  );

  if (existingIndex >= 0) {
    metadata.httpRoutes[existingIndex] = route;
  } else {
    metadata.httpRoutes.push(route);
  }
}

function addStaticRouteMetadata(
  target: (this: unknown, ...args: any[]) => unknown,
  method: HttpMethod,
  path: string,
  handlerName: string,
  docs?: HttpRouteDocs,
): void {
  (target as typeof target & {
    [CONTROLLER_ROUTE_METADATA]?: {
      method: HttpMethod;
      path: string;
      handlerName: string;
      docs?: HttpRouteDocs;
    };
  })[CONTROLLER_ROUTE_METADATA] = {
    method,
    path,
    handlerName,
    docs,
  };
}

function syncPrototypeRoutes(target: ControllerClass, metadata: ControllerMetadata): void {
  for (const key of Object.getOwnPropertyNames(target.prototype)) {
    if (key === "constructor") {
      continue;
    }

    const member = (target.prototype as Record<string, unknown>)[key];
    if (typeof member !== "function") {
      continue;
    }

    const route = (member as typeof member & {
      [CONTROLLER_ROUTE_METADATA]?: {
        method: HttpMethod;
        path: string;
        handlerName: string;
        docs?: HttpRouteDocs;
      };
    })[CONTROLLER_ROUTE_METADATA];

    if (!route) {
      continue;
    }

    addHttpRoute(metadata, route.method, route.path, route.handlerName, route.docs);
  }
}

function createHttpMethodDecorator(method: HttpMethod) {
  return (path: string, docs?: HttpRouteDocs) => {
    return function <TThis, TArgs extends any[], TReturn>(
      value: (this: TThis, ...args: TArgs) => TReturn,
      context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>,
    ): void | ((this: TThis, ...args: TArgs) => TReturn) {
      if (arguments.length === 2) {
        const metadata = getControllerStage3Metadata(context);
        addHttpRoute(metadata, method, path, String(context.name), docs);
        addStaticRouteMetadata(
          value as (this: unknown, ...args: any[]) => unknown,
          method,
          path,
          String(context.name),
          docs,
        );
        return value;
      }

      const [prototype, propertyKey] = arguments as unknown as [
        { constructor: ControllerClass },
        string | symbol,
      ];
      const metadata = ensureControllerMetadata(prototype.constructor);
      addHttpRoute(metadata, method, path, String(propertyKey), docs);
      return undefined;
    };
  };
}

export function Controller(basePath = "", options?: ControllerOptions) {
  return function <T extends ControllerClass>(value: T, context?: ClassDecoratorContext) {
    const staticMetadata = ensureControllerMetadata(value);
    staticMetadata.basePath = basePath;
    staticMetadata.options = options;
    syncPrototypeRoutes(value, staticMetadata);

    if (context) {
      const stage3Metadata = getControllerStage3Metadata(context);
      stage3Metadata.basePath = basePath;
      stage3Metadata.options = options;
    }

    setControllerLifetime(value);
    return value;
  };
}

export const Get = createHttpMethodDecorator("GET");
export const Post = createHttpMethodDecorator("POST");
export const Put = createHttpMethodDecorator("PUT");
export const Patch = createHttpMethodDecorator("PATCH");
export const Delete = createHttpMethodDecorator("DELETE");

function setMethodAuthMetadata(
  target: object,
  handlerName: string,
  auth: IRouteAuthorizationMetadata,
): void {
  const map = (target as Record<symbol, Record<string, IRouteAuthorizationMetadata>>)[METHOD_AUTH_METADATA] ??= {};
  map[handlerName] = auth;
}

export function getMethodAuthMetadata(
  controller: ControllerClass,
  handlerName: string,
): IRouteAuthorizationMetadata | undefined {
  const proto = controller.prototype as Record<string, unknown>;
  const method = proto[handlerName];
  if (typeof method === "function") {
      const fromMethod = (method as unknown as Record<symbol, Record<string, IRouteAuthorizationMetadata> | undefined>)?.[METHOD_AUTH_METADATA]?.[handlerName];
    if (fromMethod) {
      return fromMethod;
    }
  }
  return (controller.prototype as Record<symbol, Record<string, IRouteAuthorizationMetadata> | undefined>)[METHOD_AUTH_METADATA]?.[handlerName];
}

export function Authorize(requirement?: IAuthorizationRequirement): ClassDecorator & MethodDecorator {
  const auth: IRouteAuthorizationMetadata = requirement
    ? { requiresAuthentication: true, authorize: requirement }
    : { requiresAuthentication: true };

  const decorator = (...args: unknown[]) => {
    if (args.length === 3) {
      const [prototype, propertyKey] = args as [object, string | symbol, unknown?];
      setMethodAuthMetadata(prototype, String(propertyKey), auth);
      return;
    }

    if (args.length === 2) {
      const [value, context] = args as [object, ClassDecoratorContext | ClassMethodDecoratorContext | undefined];
      if (context && typeof context === "object" && "kind" in context) {
        if (context.kind === "class") {
          const metadata = ensureControllerMetadata(value as ControllerClass);
          metadata.options ??= {};
          metadata.options.authorization = auth;
          return value;
        }
        if (context.kind === "method") {
          setMethodAuthMetadata(value as object, String(context.name), auth);
          return;
        }
      }
    }

    const [value] = args as [ControllerClass];
    const metadata = ensureControllerMetadata(value);
    metadata.options ??= {};
    metadata.options.authorization = auth;
  };

  return decorator as unknown as ClassDecorator & MethodDecorator;
}

export function AllowAnonymous(): ClassDecorator & MethodDecorator {
  const auth: IRouteAuthorizationMetadata = { allowAnonymous: true };

  const decorator = (...args: unknown[]) => {
    if (args.length === 3) {
      const [prototype, propertyKey] = args as [object, string | symbol, unknown?];
      setMethodAuthMetadata(prototype, String(propertyKey), auth);
      return;
    }

    if (args.length === 2) {
      const [value, context] = args as [object, ClassDecoratorContext | ClassMethodDecoratorContext | undefined];
      if (context && typeof context === "object" && "kind" in context) {
        if (context.kind === "class") {
          const metadata = ensureControllerMetadata(value as ControllerClass);
          metadata.options ??= {};
          metadata.options.authorization = auth;
          return value;
        }
        if (context.kind === "method") {
          setMethodAuthMetadata(value as object, String(context.name), auth);
          return;
        }
      }
    }

    const [value] = args as [ControllerClass];
    const metadata = ensureControllerMetadata(value);
    metadata.options ??= {};
    metadata.options.authorization = auth;
  };

  return decorator as unknown as ClassDecorator & MethodDecorator;
}

export { getControllerMetadata };
export type { ControllerClass, ControllerMetadata, ControllerOptions };
