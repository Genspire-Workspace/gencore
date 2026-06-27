// file: packages/auth/src/server/auth-server-extension.ts

import type { GenExtension } from "@genspire/core";
import { Server } from "@genspire/server";
import { AuthController } from "./controllers/auth.controller.js";
import { RoleController } from "./controllers/role.controller.js";
import { bearerAuthMiddleware } from "./middleware/bearer-auth.middleware.js";
import { authGuardMiddleware } from "./middleware/auth-guard.middleware.js";
import { ipBanMiddleware } from "./middleware/ip-ban.middleware.js";
import type { HttpMiddleware } from "@genspire/server";
import type { AuthConfiguration } from "../application/services/auth-configuration.js";

export interface IAuthServerExtensionOptions {
  /**
   * Optional route prefix applied to auth controllers.
   * Defaults to no prefix (controllers already declare their own paths).
   */
  routePrefix?: string;
}

/**
 * Auth middlewares that the host app should mount on the server.
 *
 * The current `@genspire/server` extension model accepts middlewares only via
 * `serverExtension({ middlewares: [...] })` at server construction time, so an
 * auth server extension cannot push middlewares into an already-constructed
 * `Server`. Apps compose these explicitly, e.g.:
 *
 * ```ts
 * await app.use(authExtension(...));
 * await app.use(serverExtension({ middlewares: authServerMiddlewares(authConfig) }));
 * await app.use(authServerExtension());
 * ```
 *
 * TODO(server): once `@genspire/server` supports middleware registration after
 * construction, move this wiring inside `authServerExtension`.
 */
export function authServerMiddlewares(authConfig: AuthConfiguration): readonly HttpMiddleware[] {
  return [ipBanMiddleware(), bearerAuthMiddleware(authConfig), authGuardMiddleware()];
}

export function authServerExtension(options: IAuthServerExtensionOptions = {}): GenExtension {
  return {
    name: "auth-server",
    dependsOn: ["server", "auth"],

    register(app) {
      const server = app.get(Server);
      const controllers = [AuthController, RoleController];

      if (options.routePrefix) {
        server.group(options.routePrefix, () => {
          server.registerControllers(...controllers);
        });
      } else {
        server.registerControllers(...controllers);
      }
    },
  };
}