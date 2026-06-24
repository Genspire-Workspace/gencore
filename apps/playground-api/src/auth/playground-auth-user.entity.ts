import { Entity, Property } from "@mikro-orm/decorators";
import { AuthUserBase } from "@genspire/auth";

@Entity({ tableName: "auth_users" })
export class PlaygroundAuthUserEntity extends AuthUserBase {
  @Property({ type: "string", nullable: true })
  avatarUrl?: string | null;
}
