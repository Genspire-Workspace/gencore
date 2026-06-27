// file: packages/auth/src/server/middleware/auth-guard.middleware.ts

import type { HttpMiddleware } from "@genspire/server";
import { problem } from "@genspire/server";
import { CURRENT_USER_KEY, type ICurrentUser } from "../../domain/types/current-user.js";

export function authGuardMiddleware(): HttpMiddleware {
  return async ({ ctx, route }, next) => {
    const auth = route.authorization;

    if (!auth || auth.allowAnonymous) {
      return await next();
    }

    if (!auth.requiresAuthentication && !auth.authorize) {
      return await next();
    }

    const currentUser = ctx.items.get<ICurrentUser>(CURRENT_USER_KEY);

    if (!currentUser) {
      return problem({
        title: "Unauthorized",
        status: 401,
        detail: "Authentication is required.",
        code: "AUTH_UNAUTHORIZED",
      });
    }

    if (auth.authorize?.roles && auth.authorize.roles.length > 0) {
      const hasRole = auth.authorize.roles.some((role) =>
        currentUser.roles.includes(role.toLowerCase()),
      );

      if (!hasRole) {
        return problem({
          title: "Forbidden",
          status: 403,
          detail: "Insufficient permissions.",
          code: "AUTH_FORBIDDEN",
        });
      }
    }

    return await next();
  };
}
