// file: packages\server\src\controllers\controller-metadata.ts

import type { Constructor } from "@genspire/core";
import type { HttpMethod, HttpRouteDocs } from "../http/http-types.js";
import type { IRouteAuthorizationMetadata } from "../auth/route-authorization.js";

export interface ControllerOptions {
  tag?: string;
  description?: string;
  hide?: boolean;
  authorization?: IRouteAuthorizationMetadata;
}

export interface ControllerRouteDefinition {
  method: HttpMethod;
  path: string;
  handlerName: string;
  docs?: HttpRouteDocs;
}

export interface ControllerMetadata {
  basePath: string;
  options?: ControllerOptions;
  httpRoutes: ControllerRouteDefinition[];
}

export interface ControllerClass<T = unknown> extends Constructor<T> {
  __controllerMetadata?: ControllerMetadata;
  __diLifetime?: "scoped";
}

const SYMBOL_METADATA =
  (Symbol as typeof Symbol & { metadata?: symbol }).metadata ??
  Symbol.for("Symbol.metadata");
const CONTROLLER_STAGE3_METADATA_KEY = Symbol.for("genspire.server.controller.stage3");

interface ClassContextLike {
  metadata?: Record<PropertyKey, unknown>;
}

function createEmptyMetadata(): ControllerMetadata {
  return {
    basePath: "",
    httpRoutes: [],
  };
}

function getStage3Metadata(
  target: ControllerClass | ClassContextLike,
): ControllerMetadata {
  const container =
    "metadata" in target
      ? (target.metadata ??= {})
      : (((target as ControllerClass & {
          [SYMBOL_METADATA]?: Record<PropertyKey, unknown>;
        })[SYMBOL_METADATA] ??= {}) as Record<PropertyKey, unknown>);

  if (container[CONTROLLER_STAGE3_METADATA_KEY]) {
    return container[CONTROLLER_STAGE3_METADATA_KEY] as ControllerMetadata;
  }

  const created = createEmptyMetadata();
  container[CONTROLLER_STAGE3_METADATA_KEY] = created;
  return created;
}

function ensureStaticMetadata(target: ControllerClass): ControllerMetadata {
  if (!target.__controllerMetadata) {
    target.__controllerMetadata = createEmptyMetadata();
  }

  return target.__controllerMetadata;
}

function mergeMetadata(target: ControllerClass): ControllerMetadata {
  const staticMetadata = ensureStaticMetadata(target);
  const symbolMetadata = (
    target as ControllerClass & { [SYMBOL_METADATA]?: Record<PropertyKey, unknown> }
  )[SYMBOL_METADATA]?.[CONTROLLER_STAGE3_METADATA_KEY] as ControllerMetadata | undefined;

  if (!symbolMetadata) {
    return staticMetadata;
  }

  staticMetadata.basePath = symbolMetadata.basePath || staticMetadata.basePath;
  staticMetadata.options = symbolMetadata.options ?? staticMetadata.options;

  for (const route of symbolMetadata.httpRoutes) {
    const existingIndex = staticMetadata.httpRoutes.findIndex(
      (candidate) =>
        candidate.method === route.method &&
        candidate.path === route.path &&
        candidate.handlerName === route.handlerName,
    );

    if (existingIndex >= 0) {
      staticMetadata.httpRoutes[existingIndex] = route;
    } else {
      staticMetadata.httpRoutes.push(route);
    }
  }

  return staticMetadata;
}

export function ensureControllerMetadata(target: ControllerClass): ControllerMetadata {
  return ensureStaticMetadata(target);
}

export function getControllerMetadata(target: ControllerClass): ControllerMetadata {
  return mergeMetadata(target);
}

export function isController(target: unknown): target is ControllerClass {
  if (typeof target !== "function") {
    return false;
  }

  const controller = target as ControllerClass & {
    [SYMBOL_METADATA]?: Record<PropertyKey, unknown>;
  };
  const symbolMetadata = controller[SYMBOL_METADATA]?.[
    CONTROLLER_STAGE3_METADATA_KEY
  ] as ControllerMetadata | undefined;

  return Boolean(
    controller.__controllerMetadata ||
      symbolMetadata?.httpRoutes.length ||
      symbolMetadata?.basePath ||
      symbolMetadata?.options,
  );
}

export function getControllerStage3Metadata(context: ClassContextLike): ControllerMetadata {
  return getStage3Metadata(context);
}

export function setControllerLifetime(target: ControllerClass): void {
  target.__diLifetime = "scoped";
}
