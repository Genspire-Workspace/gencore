import { Authorize, Controller, Delete, Get, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import {
  AuthBanService,
  AuthDbContext,
  requireCurrentUser,
} from "@genspire/auth";
import type {
  AuthBannedIpEntity,
  AuthUserEntity,
} from "@genspire/auth";
import type { AuthUserBase } from "@genspire/auth";
import {
  BanIpRequestDto,
  BanUserRequestDto,
  BannedIpListResponseDto,
  BannedIpResponseDto,
  BannedUserListResponseDto,
  BannedUserResponseDto,
} from "./auth-ban.dto.js";

function toBannedIpResponse(ban: AuthBannedIpEntity): BannedIpResponseDto {
  return {
    id: ban.id,
    ipAddress: ban.ipAddress,
    reason: ban.reason,
    state: ban.state,
    bannedAt: ban.bannedAt.toISOString(),
    bannedByUserId: ban.bannedByUserId,
    expiresAt: ban.expiresAt?.toISOString() ?? null,
    revokedAt: ban.revokedAt?.toISOString() ?? null,
  };
}

function toBannedUserResponse(user: AuthUserBase): BannedUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailConfirmed: user.emailConfirmed,
    state: user.state,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

@Authorize({ roles: ["admin"] })
@Controller("/admin/bans", {
  tag: "Admin Bans",
  description: "User and IP ban management endpoints",
})
export class AuthBanController {
  static inject = [AuthBanService, AuthDbContext];

  constructor(
    private readonly banService: AuthBanService,
    private readonly db: AuthDbContext,
  ) {}

  @Post("/users", {
    summary: "Ban a user",
    requestBody: BanUserRequestDto,
    responses: {
      200: { description: "User banned" },
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error"),
      },
      404: {
        description: "User not found",
        body: defineProblemDetailsType("Not found"),
      },
    },
  })
  async banUser(ctx: RequestContext) {
    const body = await ctx.json<BanUserRequestDto>();
    if (!body.userId) {
      return problem({ status: 400, title: "User ID is required." });
    }

    const banned = await this.banService.banUser(body.userId, body.reason ?? null);
    if (!banned) {
      return problem({ status: 404, title: "User not found." });
    }

    return json({ banned: true });
  }

  @Delete("/users/:userId", {
    summary: "Unban a user",
    responses: {
      200: { description: "User unbanned" },
      404: {
        description: "User not found or already unbanned",
        body: defineProblemDetailsType("Not found"),
      },
    },
  })
  async unbanUser(ctx: RequestContext) {
    const userId = ctx.params.userId;
    if (!userId) {
      return problem({ status: 400, title: "User ID is required." });
    }

    const unbanned = await this.banService.unbanUser(userId);
    return json({ unbanned });
  }

  @Get("/users", {
    summary: "List all banned users",
    response: BannedUserListResponseDto,
  })
  async listBannedUsers() {
    const users = await this.db.users.list({
      where: { state: "banned" } as Partial<AuthUserEntity>,
      orderBy: "email" as keyof AuthUserEntity & string,
      direction: "asc",
    });

    return { items: users.map(toBannedUserResponse) };
  }

  @Post("/ips", {
    summary: "Ban an IP address",
    requestBody: BanIpRequestDto,
    response: BannedIpResponseDto,
    responses: {
      201: { description: "IP banned" },
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error"),
      },
    },
  })
  async banIp(ctx: RequestContext) {
    const body = await ctx.json<BanIpRequestDto>();
    if (!body.ipAddress) {
      return problem({ status: 400, title: "IP address is required." });
    }

    const currentUser = requireCurrentUser(ctx);

    const ban = await this.banService.banIp({
      ipAddress: body.ipAddress,
      reason: body.reason ?? null,
      bannedByUserId: currentUser.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });

    return json(toBannedIpResponse(ban), { status: 201 });
  }

  @Delete("/ips/:ipAddress", {
    summary: "Revoke an IP ban",
    responses: {
      200: { description: "IP ban revoked" },
      404: {
        description: "Ban not found",
        body: defineProblemDetailsType("Not found"),
      },
    },
  })
  async revokeIpBan(ctx: RequestContext) {
    const ipAddress = ctx.params.ipAddress;
    if (!ipAddress) {
      return problem({ status: 400, title: "IP address is required." });
    }

    const revoked = await this.banService.revokeIpBan(ipAddress);
    return json({ revoked });
  }

  @Get("/ips", {
    summary: "List all active IP bans",
    response: BannedIpListResponseDto,
  })
  async listBannedIps() {
    const bans = await this.db.bannedIps.list({
      where: { state: "active" } as Partial<AuthBannedIpEntity>,
      orderBy: "bannedAt" as keyof AuthBannedIpEntity & string,
      direction: "desc",
    });

    return { items: bans.map(toBannedIpResponse) };
  }
}
