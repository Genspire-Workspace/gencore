// file: packages\auth\src\types\auth-options.ts

import type { EntityClass } from "@mikro-orm/core";
import { AuthUserBase, AuthUserEntity } from "../entities/auth-user.entity.js";
import { AuthRefreshTokenEntity } from "../entities/auth-refresh-token.entity.js";

export interface IAuthExtensionOptions<
  TUser extends AuthUserBase = AuthUserEntity,
> {
  userEntity?: EntityClass<TUser>;
  refreshTokenEntity?: EntityClass<AuthRefreshTokenEntity>;
  jwtSecret: string;
  issuer?: string;
  audience?: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export type RequiredAuthExtensionOptions<
  TUser extends AuthUserBase = AuthUserEntity,
> = Required<IAuthExtensionOptions<TUser>>;

export function resolveAuthExtensionOptions<
  TUser extends AuthUserBase = AuthUserEntity,
>(options: IAuthExtensionOptions<TUser>): RequiredAuthExtensionOptions<TUser> {
  if (!options.jwtSecret) {
    throw new Error("jwtSecret is required for auth extension");
  }

  return {
    userEntity: (options.userEntity ?? AuthUserEntity) as EntityClass<TUser>,
    refreshTokenEntity: options.refreshTokenEntity ?? AuthRefreshTokenEntity,
    jwtSecret: options.jwtSecret,
    issuer: options.issuer ?? "gencore-auth",
    audience: options.audience ?? "gencore",
    accessTokenTtlSeconds: options.accessTokenTtlSeconds ?? 15 * 60,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds ?? 30 * 24 * 60 * 60,
  };
}
