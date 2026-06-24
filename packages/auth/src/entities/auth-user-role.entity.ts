import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/decorators";

@Entity({ tableName: "auth_user_roles" })
export class AuthUserRoleEntity {
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
