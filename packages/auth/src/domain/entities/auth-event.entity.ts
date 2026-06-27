// file: packages/auth/src/domain/entities/auth-event.entity.ts

import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/decorators";
import type { IEntity } from "@genspire/data";

@Entity({ tableName: "auth_events" })
export class AuthEventEntity implements IEntity<string> {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string", nullable: true })
  @Index()
  userId?: string | null;

  @Property({ type: "string", nullable: true })
  @Index()
  email?: string | null;

  @Property({ type: "string" })
  @Index()
  eventType!: string;

  @Property({ type: "string", nullable: true })
  @Index()
  ipAddress?: string | null;

  @Property({ type: "string", nullable: true })
  userAgent?: string | null;

  @Property({ type: "boolean" })
  @Index()
  success!: boolean;

  @Property({ type: "string", nullable: true })
  failureCode?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  @Index()
  createdAt: Date = new Date();
}
