import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import {
  MikroOrmMigrationRunner,
  MikroOrmService,
  mikroOrmExtension,
} from "@genspire/data-mikroorm";
import { serverExtension, Server } from "@genspire/server";
import { swaggerExtension } from "@genspire/swagger";
import { authExtension, AuthConfiguration, AuthController, RoleController, bearerAuthMiddleware, authGuardMiddleware, ipBanMiddleware } from "@genspire/auth";
import { PlaygroundAuthUserEntity } from "./auth/playground-auth-user.entity.js";
import {
  createPlaygroundMikroOrmConfig,
  resolvePlaygroundSchemaMode,
} from "./database/playground-database-config.js";
import { HealthController } from "./health/health.controller.js";
import { TodoController } from "./todos/todo.controller.js";

export interface PlaygroundAppOptions {
  port?: number;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
}

export async function createPlaygroundApp(
  options: PlaygroundAppOptions = {},
) {
  const app = createApp();
  const env = options.env ?? process.env;
  const schemaMode = resolvePlaygroundSchemaMode(env);

  await app.use(
    dataExtension({
      runSeedersOnStart: false,
    }),
  );

  await app.use(
    mikroOrmExtension(
      await createPlaygroundMikroOrmConfig(options.repoRoot, env),
    ),
  );

  await app.use(
    authExtension({
      userEntity: PlaygroundAuthUserEntity,
      jwtSecret: env.GENCORE_AUTH_JWT_SECRET ?? "dev-playground-secret-change-me",
      issuer: "gencore-playground-api",
      audience: "gencore-playground",
    }),
  );

  if (schemaMode !== "none") {
    await app.use({
      name: "playground-schema",
      dependsOn: ["data-mikroorm", "auth"],
      async start(currentApp) {
        if (schemaMode === "update") {
          // Playground-only schema sync. Production deployments should use migrations.
          await currentApp.get(MikroOrmService).getOrm().schema.update();
          return;
        }

        await currentApp.get(MikroOrmMigrationRunner).up();
      },
    });
  }

  const authConfig = app.get(AuthConfiguration);

  await app.use(
    serverExtension({
      port: options.port ?? 3000,
      trustProxy: true,
      middlewares: [
        ipBanMiddleware(),
        bearerAuthMiddleware(authConfig),
        authGuardMiddleware(),
      ],
    }),
  );

  await app.use(
    swaggerExtension({
      title: "GenCore Playground API",
      version: "0.1.0",
      description: "Playground API for testing GenCore controllers, Swagger, and libSQL",
    }),
  );

  app.get(Server).registerControllers(HealthController, AuthController, RoleController, TodoController);

  return app;
}
