// file: packages/auth/src/application/services/auth-ban.service.ts

import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../../infrastructure/persistence/auth-db-context.js";
import { AuthBannedIpEntity } from "../../domain/entities/auth-banned-ip.entity.js";

@Scoped()
export class AuthBanService {
  static inject = [AuthDbContext];

  constructor(private readonly db: AuthDbContext) {}

  async banIp(input: {
    ipAddress: string;
    reason?: string | null;
    bannedByUserId?: string | null;
    expiresAt?: Date | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuthBannedIpEntity> {
    const ip = input.ipAddress.trim();
    if (!ip) {
      throw new GenError("IP address is required.", "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.findActiveBan(ip);
    if (existing) {
      return existing;
    }

    const ban = new AuthBannedIpEntity();
    ban.id = crypto.randomUUID();
    ban.ipAddress = ip;
    ban.reason = input.reason ?? null;
    ban.bannedByUserId = input.bannedByUserId ?? null;
    ban.expiresAt = input.expiresAt ?? null;
    ban.state = "active";
    ban.createdAt = new Date();
    ban.bannedAt = ban.createdAt;
    ban.metadata = input.metadata ?? null;

    await this.db.bannedIps.add(ban);
    await this.db.saveChanges();
    return ban;
  }

  async revokeIpBan(ipAddress: string): Promise<boolean> {
    const ban = await this.findActiveBan(ipAddress.trim());
    if (!ban) {
      return false;
    }

    ban.state = "revoked";
    ban.revokedAt = new Date();
    await this.db.bannedIps.update(ban);
    await this.db.saveChanges();
    return true;
  }

  async isIpBanned(ipAddress: string | null | undefined): Promise<boolean> {
    if (!ipAddress) {
      return false;
    }

    const ban = await this.findActiveBan(ipAddress.trim());
    return ban != null;
  }

  async banUser(userId: string, reason?: string | null): Promise<boolean> {
    const user = await this.db.users.findById(userId);
    if (!user) {
      return false;
    }

    if (user.state === "banned") {
      return true;
    }

    user.state = "banned";
    await this.db.users.update(user);
    await this.db.saveChanges();
    return true;
  }

  async unbanUser(userId: string): Promise<boolean> {
    const user = await this.db.users.findById(userId);
    if (!user) {
      return false;
    }

    if (user.state !== "banned") {
      return false;
    }

    user.state = "active";
    await this.db.users.update(user);
    await this.db.saveChanges();
    return true;
  }

  private async findActiveBan(ipAddress: string): Promise<AuthBannedIpEntity | null> {
    const bans = await this.db.bannedIps.list({
      where: { ipAddress } as Partial<AuthBannedIpEntity>,
    });

    for (const ban of bans) {
      if (ban.state !== "active") {
        continue;
      }
      if (ban.revokedAt) {
        continue;
      }
      if (ban.expiresAt && ban.expiresAt <= new Date()) {
        continue;
      }
      return ban;
    }

    return null;
  }
}
