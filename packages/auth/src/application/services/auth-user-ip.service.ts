// file: packages/auth/src/application/services/auth-user-ip.service.ts

import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../../infrastructure/persistence/auth-db-context.js";
import { AuthUserIpEntity } from "../../domain/entities/auth-user-ip.entity.js";
import type { IAuthRequestMetadata } from "../contracts/auth-request-metadata.js";

export interface IRecordKnownIpInput {
  userId: string;
  metadata?: IAuthRequestMetadata;
}

/**
 * Tracks the known IP addresses for a user (distinct from IP bans).
 * Recording is upsert-style: an existing (userId, ipAddress) row is updated
 * on each sighting instead of duplicated.
 */
@Scoped()
export class AuthUserIpService {
  static inject = [AuthDbContext];

  constructor(private readonly db: AuthDbContext) {}

  /**
   * Records (or refreshes) a known IP for a user. Best-effort callers may wrap
   * this in try/catch so IP tracking never breaks the auth flow.
   */
  async recordKnownIp(input: IRecordKnownIpInput): Promise<AuthUserIpEntity> {
    const userId = input.userId?.trim();
    const ipAddress = input.metadata?.ipAddress?.trim() ?? null;

    if (!userId) {
      throw new GenError("userId is required.", "AUTH_VALIDATION_ERROR");
    }
    if (!ipAddress) {
      throw new GenError("ipAddress is required.", "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.db.userIps.findOne({
      userId,
      ipAddress,
    } as Partial<AuthUserIpEntity>);

    const now = new Date();

    if (existing) {
      existing.lastSeenAt = now;
      existing.seenCount += 1;
      existing.userAgent = input.metadata?.userAgent ?? existing.userAgent;
      await this.db.userIps.update(existing);
      await this.db.saveChanges();
      return existing;
    }

    const entry = new AuthUserIpEntity();
    entry.id = crypto.randomUUID();
    entry.userId = userId;
    entry.ipAddress = ipAddress;
    entry.createdAt = now;
    entry.lastSeenAt = now;
    entry.seenCount = 1;
    entry.userAgent = input.metadata?.userAgent ?? null;
    entry.metadata = null;

    await this.db.userIps.add(entry);
    await this.db.saveChanges();
    return entry;
  }

  async listForUser(userId: string): Promise<AuthUserIpEntity[]> {
    return await this.db.userIps.list({
      where: { userId } as Partial<AuthUserIpEntity>,
      orderBy: "lastSeenAt",
      direction: "desc",
    });
  }

  async findForUser(
    userId: string,
    ipAddress: string,
  ): Promise<AuthUserIpEntity | null> {
    return await this.db.userIps.findOne({
      userId,
      ipAddress: ipAddress.trim(),
    } as Partial<AuthUserIpEntity>);
  }

  async forgetForUser(userId: string, ipAddress: string): Promise<boolean> {
    const entry = await this.findForUser(userId, ipAddress);
    if (!entry) {
      return false;
    }

    await this.db.userIps.remove(entry);
    await this.db.saveChanges();
    return true;
  }
}
