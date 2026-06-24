import type { GenExtension } from "@genspire/core";
import { Argon2PasswordHasher } from "../hashing/argon2-password-hasher.js";
import { TokenService } from "../services/token.service.js";
import { AuthConfiguration } from "../services/auth-configuration.js";
import { AuthDbContext } from "../context/auth-db-context.js";
import { AuthService } from "../services/auth.service.js";
import { AuthRoleService } from "../services/auth-role.service.js";
import { AuthEventService } from "../services/auth-event.service.js";
import { AuthBanService } from "../services/auth-ban.service.js";
import { PasswordHasher } from "../hashing/password-hasher.js";
import type { IAuthExtensionOptions } from "../types/auth-options.js";

export function authExtension(options: IAuthExtensionOptions): GenExtension {
  return {
    name: "auth",
    dependsOn: ["data", "data-mikroorm"] as const,

    register(app) {
      if (!options.jwtSecret) {
        throw new Error(
          "jwtSecret is required for @genspire/auth. Provide it in authExtension({ jwtSecret: '...' }).",
        );
      }

      const config = new AuthConfiguration(options);
      app.provide(AuthConfiguration, config);
      app.registerSingleton(TokenService);
      app.registerSingleton(PasswordHasher, Argon2PasswordHasher);
      app.registerScoped(AuthDbContext);
      app.registerScoped(AuthService);
      app.registerScoped(AuthRoleService);
      app.registerScoped(AuthEventService);
      app.registerScoped(AuthBanService);
    },
  };
}
