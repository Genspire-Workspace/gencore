// file: packages/auth/src/infrastructure/persistence/auth-db-context.ts

import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import { AuthConfiguration } from "../../application/services/auth-configuration.js";
import type { AuthUserBase, AuthUserEntity } from "../../domain/entities/auth-user.entity.js";
import type { AuthRefreshTokenEntity } from "../../domain/entities/auth-refresh-token.entity.js";
import { AuthRoleEntity } from "../../domain/entities/auth-role.entity.js";
import { AuthUserRoleEntity } from "../../domain/entities/auth-user-role.entity.js";
import { AuthEventEntity } from "../../domain/entities/auth-event.entity.js";
import { AuthBannedIpEntity } from "../../domain/entities/auth-banned-ip.entity.js";
import type { MikroOrmDbSet } from "@genspire/data-mikroorm";

@Scoped()
export class AuthDbContext<
  TUser extends AuthUserBase = AuthUserEntity,
> extends MikroOrmDbContext {
  static inject = [EntityManagerProvider, AuthConfiguration];

  readonly users: MikroOrmDbSet<TUser, string>;
  readonly refreshTokens: MikroOrmDbSet<AuthRefreshTokenEntity, string>;
  readonly roles: MikroOrmDbSet<AuthRoleEntity, string>;
  readonly userRoles: MikroOrmDbSet<AuthUserRoleEntity, string>;
  readonly events: MikroOrmDbSet<AuthEventEntity, string>;
  readonly bannedIps: MikroOrmDbSet<AuthBannedIpEntity, string>;

  constructor(
    entityManagerProvider: EntityManagerProvider,
    config: AuthConfiguration<TUser>,
  ) {
    super(entityManagerProvider);
    this.users = this.set<TUser, string>(config.options.userEntity);
    this.refreshTokens = this.set<AuthRefreshTokenEntity, string>(
      config.options.refreshTokenEntity,
    );
    this.roles = this.set<AuthRoleEntity, string>(AuthRoleEntity);
    this.userRoles = this.set<AuthUserRoleEntity, string>(AuthUserRoleEntity);
    this.events = this.set<AuthEventEntity, string>(AuthEventEntity);
    this.bannedIps = this.set<AuthBannedIpEntity, string>(AuthBannedIpEntity);
  }
}
