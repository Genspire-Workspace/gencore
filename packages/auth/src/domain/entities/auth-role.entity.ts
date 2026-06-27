// file: packages/auth/src/domain/entities/auth-role.entity.ts

import { Entity, PrimaryKey, Property, Unique, Index } from "@mikro-orm/decorators";
import type { IEntity } from "@genspire/data";

@Entity({ tableName: "auth_roles" })
export class AuthRoleEntity implements IEntity<string> {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string" })
  @Unique()
  @Index()
  normalizedName!: string;

  @Property({ type: "string", nullable: true })
  description?: string | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
