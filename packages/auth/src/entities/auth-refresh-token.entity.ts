import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  Index,
} from "@mikro-orm/decorators";

@Entity({ tableName: "auth_refresh_tokens" })
export class AuthRefreshTokenEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  @Index()
  userId!: string;

  @Property({ type: "string" })
  @Unique()
  @Index()
  tokenHash!: string;

  @Property({ type: "datetime" })
  expiresAt!: Date;

  @Property({ type: "datetime", nullable: true })
  revokedAt?: Date | null;

  @Property({ type: "string", nullable: true })
  replacedByTokenId?: string | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "string", nullable: true })
  createdByIp?: string | null;

  @Property({ type: "string", nullable: true })
  revokedByIp?: string | null;

  @Property({ type: "string", nullable: true })
  userAgent?: string | null;
}
