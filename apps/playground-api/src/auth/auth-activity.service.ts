// file: apps\playground-api\src\auth\auth-activity.service.ts

import { Scoped } from "@genspire/core";
import { AuthDbContext } from "@genspire/auth";
import type { AuthEventEntity } from "@genspire/auth";
import type {
  AuthActivityPageResponseDto,
  AuthEventResponseDto,
} from "./auth-activity.dto.js";

function toEventResponse(event: AuthEventEntity): AuthEventResponseDto {
  return {
    id: event.id,
    userId: event.userId,
    email: event.email,
    eventType: event.eventType,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    success: event.success,
    failureCode: event.failureCode,
    createdAt: event.createdAt.toISOString(),
  };
}

function toPageResult(
  items: AuthEventEntity[],
  page: number,
  pageSize: number,
): AuthActivityPageResponseDto {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    items: pagedItems.map(toEventResponse),
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

@Scoped()
export class AuthActivityService {
  static inject = [AuthDbContext];

  constructor(private readonly db: AuthDbContext) {}

  async listAll(page = 1, pageSize = 25): Promise<AuthActivityPageResponseDto> {
    const result = await this.db.events.page({
      page,
      pageSize,
      orderBy: "createdAt",
      direction: "desc",
    });

    return {
      ...result,
      items: result.items.map(toEventResponse),
    };
  }

  async listForUser(
    userId: string,
    page = 1,
    pageSize = 25,
  ): Promise<AuthActivityPageResponseDto> {
    const events = await this.db.events.list({
      where: { userId } as Partial<AuthEventEntity>,
      orderBy: "createdAt",
      direction: "desc",
    });

    return toPageResult(events, page, pageSize);
  }

  async listForIp(
    ipAddress: string,
    page = 1,
    pageSize = 25,
  ): Promise<AuthActivityPageResponseDto> {
    const events = await this.db.events.list({
      where: { ipAddress } as Partial<AuthEventEntity>,
      orderBy: "createdAt",
      direction: "desc",
    });

    return toPageResult(events, page, pageSize);
  }
}
