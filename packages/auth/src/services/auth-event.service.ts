// file: packages\auth\src\services\auth-event.service.ts

import { Scoped } from "@genspire/core";
import { AuthDbContext } from "../context/auth-db-context.js";
import { AuthEventEntity } from "../entities/auth-event.entity.js";
import type { AuthEventType } from "../types/auth-event-types.js";

@Scoped()
export class AuthEventService {
  static inject = [AuthDbContext];

  constructor(private readonly db: AuthDbContext) {}

  async record(input: {
    userId?: string | null;
    email?: string | null;
    eventType: AuthEventType;
    ipAddress?: string | null;
    userAgent?: string | null;
    success: boolean;
    failureCode?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuthEventEntity> {
    const event = new AuthEventEntity();
    event.id = crypto.randomUUID();
    event.userId = input.userId ?? null;
    event.email = input.email ?? null;
    event.eventType = input.eventType;
    event.ipAddress = input.ipAddress ?? null;
    event.userAgent = input.userAgent ?? null;
    event.success = input.success;
    event.failureCode = input.failureCode ?? null;
    event.metadata = input.metadata ?? null;
    event.createdAt = new Date();

    await this.db.events.add(event);
    await this.db.saveChanges();
    return event;
  }

  async listForUser(userId: string, limit?: number): Promise<AuthEventEntity[]> {
    return await this.db.events.list({
      where: { userId } as Partial<AuthEventEntity>,
      orderBy: "createdAt",
      direction: "desc",
      ...(limit ? { limit } : {}),
    });
  }

  async listForIp(ipAddress: string, limit?: number): Promise<AuthEventEntity[]> {
    return await this.db.events.list({
      where: { ipAddress } as Partial<AuthEventEntity>,
      orderBy: "createdAt",
      direction: "desc",
      ...(limit ? { limit } : {}),
    });
  }
}
