// file: packages/auth/src/server/middleware/ip-ban.middleware.ts

import type { HttpMiddleware } from "@genspire/server";
import { problem } from "@genspire/server";
import { AuthBanService } from "../../application/services/auth-ban.service.js";
import { AuthEventService } from "../../application/services/auth-event.service.js";

export function ipBanMiddleware(): HttpMiddleware {
  return async ({ ctx }, next) => {
    const ip = ctx.clientIp;
    if (!ip) {
      return await next();
    }

    const banService = ctx.container.resolve(AuthBanService) as AuthBanService;

    if (await banService.isIpBanned(ip)) {
      try {
        const eventService = ctx.container.resolve(AuthEventService) as AuthEventService;
        await eventService.record({
          eventType: "ip_blocked",
          ipAddress: ip,
          userAgent: ctx.header("user-agent") ?? null,
          success: false,
          failureCode: "AUTH_IP_BLOCKED",
        });
      } catch {
        // Event logging should not block the response
      }

      return problem({
        title: "Forbidden",
        status: 403,
        detail: "This IP address is blocked.",
        code: "AUTH_IP_BLOCKED",
      });
    }

    return await next();
  };
}
