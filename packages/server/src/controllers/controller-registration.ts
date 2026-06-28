// file: packages\server\src\controllers\controller-registration.ts

import type { Container } from "@genspire/core";
import type { HttpContext } from "../context/http-context.js";
import type { HttpRouteDocs } from "../http/http-types.js";
import { Router } from "../routing/router.js";
import type { ControllerClass } from "./controller-metadata.js";
import { getControllerMetadata } from "./controller-metadata.js";
import { getMethodAuthMetadata } from "./controller.js";

function normalizePath(path: string): string {
  const normalized = `/${path}`.replace(/\/+/g, "/");
  return normalized === "/" ? normalized : normalized.replace(/\/$/, "");
}

function joinPaths(basePath: string, path: string): string {
  return normalizePath(`${basePath}/${path}`);
}

function resolveRouteDocs(
  controller: ControllerClass,
  handlerName: string,
  docs?: HttpRouteDocs,
): HttpRouteDocs | undefined {
  const metadata = getControllerMetadata(controller);
  const methodAuth = getMethodAuthMetadata(controller, handlerName);

  const mergedAuth = methodAuth ?? docs?.authorization;

  if (!docs && !metadata.options?.tag && !mergedAuth) {
    return undefined;
  }

  return {
    tags: docs?.tags ?? (metadata.options?.tag ? [metadata.options.tag] : undefined),
    ...docs,
    ...(mergedAuth ? { authorization: mergedAuth } : {}),
  };
}

export function registerControllerRoutes(
  router: Router,
  container: Container,
  controller: ControllerClass,
  prefix = "",
): void {
  const metadata = getControllerMetadata(controller);

  if (!container.isRegistered(controller)) {
    container.autoRegister(controller);
  }

  for (const route of metadata.httpRoutes) {
    router.add(
      route.method,
      joinPaths(prefix, joinPaths(metadata.basePath, route.path)),
      async (ctx: HttpContext) => {
        const instance = ctx.container.resolve(controller);
        const handler = (instance as Record<string, unknown>)[route.handlerName];

        if (typeof handler !== "function") {
          throw new Error(
            `Handler '${route.handlerName}' was not found on controller '${controller.name}'.`,
          );
        }

        return await Promise.resolve(handler.call(instance, ctx));
      },
      {
        controllerClass: controller,
        controllerOptions: metadata.options,
        handlerName: route.handlerName,
        docs: resolveRouteDocs(controller, route.handlerName, route.docs),
        hidden: metadata.options?.hide ?? false,
      },
    );
  }
}

export function registerControllers(
  router: Router,
  container: Container,
  prefix = "",
  ...controllers: ControllerClass[]
): void {
  for (const controller of controllers) {
    registerControllerRoutes(router, container, controller, prefix);
  }
}
