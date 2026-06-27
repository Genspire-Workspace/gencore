// file: packages/auth/src/domain/entities/auth-banned-ip.entity.ts

import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/decorators";

@Entity({ tableName: "auth_banned_ips" })
export class AuthBannedIpEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  @Index()
  ipAddress!: string;

  @Property({ type: "string", nullable: true })
  reason?: string | null;

  @Property({ type: "string" })
  state: "active" | "revoked" = "active";

  @Property({ type: "datetime" })
  @Index()
  bannedAt: Date = new Date();

  @Property({ type: "string", nullable: true })
  bannedByUserId?: string | null;

  @Property({ type: "datetime", nullable: true })
  @Index()
  expiresAt?: Date | null;

  @Property({ type: "datetime", nullable: true })
  revokedAt?: Date | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;
}
