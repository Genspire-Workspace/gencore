import { Authorize, Controller, Get, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { AuthActivityService } from "./auth-activity.service.js";
import {
  AuthActivityPageResponseDto,
  AuthActivityQueryDto,
} from "./auth-activity.dto.js";

function parsePageQuery(ctx: RequestContext): { page: number; pageSize: number } {
  const rawPage = ctx.query.get("page");
  const rawPageSize = ctx.query.get("pageSize");

  const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;
  const pageSize = Math.min(100, Math.max(1, rawPageSize ? parseInt(rawPageSize, 10) || 25 : 25));

  return { page, pageSize };
}

@Authorize({ roles: ["admin"] })
@Controller("/auth-activity", {
  tag: "Auth Activity",
  description: "Auth event monitoring endpoints",
})
export class AuthActivityController {
  static inject = [AuthActivityService];

  constructor(private readonly service: AuthActivityService) {}

  @Get("/", {
    summary: "List all auth events",
    query: AuthActivityQueryDto,
    response: AuthActivityPageResponseDto,
    responses: {
      401: {
        description: "Unauthorized",
        body: defineProblemDetailsType("Unauthorized"),
      },
    },
  })
  async listAll(ctx: RequestContext) {
    const { page, pageSize } = parsePageQuery(ctx);
    return this.service.listAll(page, pageSize);
  }

  @Get("/user/:userId", {
    summary: "List auth events for a user",
    query: AuthActivityQueryDto,
    response: AuthActivityPageResponseDto,
    responses: {
      400: {
        description: "Missing user id",
        body: defineProblemDetailsType("Validation error"),
      },
      401: {
        description: "Unauthorized",
        body: defineProblemDetailsType("Unauthorized"),
      },
      404: {
        description: "User not found",
        body: defineProblemDetailsType("Not found"),
      },
    },
  })
  async listForUser(ctx: RequestContext) {
    const userId = ctx.params.userId;
    if (!userId) {
      return problem({ status: 400, title: "User id is required." });
    }

    const { page, pageSize } = parsePageQuery(ctx);
    return this.service.listForUser(userId, page, pageSize);
  }

  @Get("/ip/:ipAddress", {
    summary: "List auth events for an IP address",
    query: AuthActivityQueryDto,
    response: AuthActivityPageResponseDto,
    responses: {
      400: {
        description: "Missing IP address",
        body: defineProblemDetailsType("Validation error"),
      },
      401: {
        description: "Unauthorized",
        body: defineProblemDetailsType("Unauthorized"),
      },
    },
  })
  async listForIp(ctx: RequestContext) {
    const ipAddress = ctx.params.ipAddress;
    if (!ipAddress) {
      return problem({ status: 400, title: "IP address is required." });
    }

    const { page, pageSize } = parsePageQuery(ctx);
    return this.service.listForIp(ipAddress, page, pageSize);
  }
}
