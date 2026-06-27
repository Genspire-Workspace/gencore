// file: packages/auth/src/application/services/auth-configuration.ts

import type {
  IAuthExtensionOptions,
  RequiredAuthExtensionOptions,
} from "../contracts/auth-options.js";
import { resolveAuthExtensionOptions } from "../contracts/auth-options.js";
import type { AuthUserBase } from "../../domain/entities/auth-user.entity.js";
import type { AuthUserEntity } from "../../domain/entities/auth-user.entity.js";

export class AuthConfiguration<
  TUser extends AuthUserBase = AuthUserEntity,
> {
  readonly options: RequiredAuthExtensionOptions<TUser>;

  constructor(options: IAuthExtensionOptions<TUser>) {
    this.options = resolveAuthExtensionOptions(options);
  }
}
