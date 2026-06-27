// file: packages/auth/src/domain/entities/auth-user-role.entity.ts

import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/decorators";
import type { IEntity } from "@genspire/data";

@Entity({ tableName: "auth_user_roles" })
export class AuthUserRoleEntity implements IEntity<string> {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  @Index()
  userId!: string;

  @Property({ type: "string" })
  @Index()
  roleId!: string;

  @Property({ type: "string" })
  @Index()
  roleName!: string;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();
}
