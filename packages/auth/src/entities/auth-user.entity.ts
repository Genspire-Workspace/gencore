// file: packages\auth\src\entities\auth-user.entity.ts

import { Entity, PrimaryKey, Property, Unique, Index } from "@mikro-orm/decorators";
import type { AuthUserState } from "../types/auth-user-state.js";

export abstract class AuthUserBase {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  @Unique()
  email!: string;

  @Property({ type: "string" })
  @Unique()
  @Index()
  normalizedEmail!: string;

  @Property({ type: "string" })
  passwordHash!: string;

  @Property({ type: "string", nullable: true })
  displayName?: string | null;

  @Property({ type: "boolean" })
  emailConfirmed = false;

  @Property({ type: "string" })
  state: AuthUserState = "active";

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ type: "datetime", nullable: true })
  lastLoginAt?: Date | null;
}

@Entity({ tableName: "auth_users" })
export class AuthUserEntity extends AuthUserBase {}
