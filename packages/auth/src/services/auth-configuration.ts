import type {
  IAuthExtensionOptions,
  RequiredAuthExtensionOptions,
} from "../types/auth-options.js";
import type { AuthUserBase } from "../entities/auth-user.entity.js";
import type { AuthUserEntity } from "../entities/auth-user.entity.js";
import { resolveAuthExtensionOptions } from "../types/auth-options.js";

export class AuthConfiguration<
  TUser extends AuthUserBase = AuthUserEntity,
> {
  readonly options: RequiredAuthExtensionOptions<TUser>;

  constructor(options: IAuthExtensionOptions<TUser>) {
    this.options = resolveAuthExtensionOptions(options);
  }
}
