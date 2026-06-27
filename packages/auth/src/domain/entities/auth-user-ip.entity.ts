// file: packages/auth/src/domain/entities/auth-user-ip.entity.ts

import { Entity, PrimaryKey, Property, Index, Unique } from "@mikro-orm/decorators";
import type { IEntity } from "@genspire/data";

/**
 * Tracks the IP addresses observed for a user (known IPs), separate from bans.
 * One row per (userId, ipAddress) pair, updated on each sighting.
 */
@Entity({ tableName: "auth_user_ips" })
@Unique({ properties: ["userId", "ipAddress"] })
export class AuthUserIpEntity implements IEntity<string> {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  @Index()
  userId!: string;

  @Property({ type: "string" })
  @Index()
  ipAddress!: string;

  @Property({ type: "datetime" })
  @Index()
  createdAt: Date = new Date();

  @Property({ type: "datetime" })
  @Index()
  lastSeenAt: Date = new Date();

  @Property({ type: "number" })
  seenCount: number = 1;

  @Property({ type: "string", nullable: true })
  userAgent?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;
}
