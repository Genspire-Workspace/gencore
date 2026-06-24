import type { HttpMiddleware } from "@genspire/server";
import { jwtVerify } from "jose";
import { AuthConfiguration } from "../services/auth-configuration.js";
import { AuthDbContext } from "../context/auth-db-context.js";
import { AuthEventService } from "../services/auth-event.service.js";
import { CURRENT_USER_KEY, type ICurrentUser } from "../types/current-user.js";

export function bearerAuthMiddleware(
  config: AuthConfiguration,
): HttpMiddleware {
  const secret = new TextEncoder().encode(config.options.jwtSecret);
  const issuer = config.options.issuer;
  const audience = config.options.audience;

  return async ({ ctx }, next) => {
    const authHeader = ctx.req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return await next();
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return await next();
    }

    try {
      const { payload } = await jwtVerify(token, secret, { issuer, audience });

      const userId = payload.sub;
      if (!userId) {
        return await next();
      }

      const db = ctx.container.resolve(AuthDbContext) as AuthDbContext;
      const user = await db.users.findById(userId);
      if (!user) {
        return await next();
      }

      if (user.state !== "active") {
        if (user.state === "banned") {
          try {
            const events = ctx.container.resolve(AuthEventService) as AuthEventService;
            await events.record({
              eventType: "user_blocked",
              userId: user.id,
              email: user.email,
              ipAddress: ctx.clientIp ?? null,
              userAgent: ctx.header("user-agent") ?? null,
              success: false,
              failureCode: "AUTH_USER_BANNED",
            });
          } catch {
            // Event logging should not break auth flow
          }
        }
        return await next();
      }

      const userRoles = await db.userRoles.list({
        where: { userId } as Partial<{ userId: string }>,
      });

      const currentUser: ICurrentUser = {
        id: user.id,
        email: user.email,
        roles: userRoles.map((r) => r.roleName),
      };

      ctx.items.set(CURRENT_USER_KEY, currentUser);
    } catch {
      // Token invalid — leave current user null
    }

    return await next();
  };
}
