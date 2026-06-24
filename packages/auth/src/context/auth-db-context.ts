import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import { AuthConfiguration } from "../services/auth-configuration.js";
import type { AuthUserBase, AuthUserEntity } from "../entities/auth-user.entity.js";
import type { AuthRefreshTokenEntity } from "../entities/auth-refresh-token.entity.js";
import type { MikroOrmDbSet } from "@genspire/data-mikroorm";

@Scoped()
export class AuthDbContext<
  TUser extends AuthUserBase = AuthUserEntity,
> extends MikroOrmDbContext {
  static inject = [EntityManagerProvider, AuthConfiguration];

  readonly users: MikroOrmDbSet<TUser, string>;
  readonly refreshTokens: MikroOrmDbSet<AuthRefreshTokenEntity, string>;

  constructor(
    entityManagerProvider: EntityManagerProvider,
    config: AuthConfiguration<TUser>,
  ) {
    super(entityManagerProvider);
    this.users = this.set<TUser, string>(config.options.userEntity);
    this.refreshTokens = this.set<AuthRefreshTokenEntity, string>(
      config.options.refreshTokenEntity,
    );
  }
}
