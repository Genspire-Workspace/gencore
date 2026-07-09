// file: apps\playground-api\src\playground-app.ts

import { createApp, defineApp, EventBus, registerEventSubscribers } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import {
  MikroOrmMigrationRunner,
  MikroOrmService,
  mikroOrmExtension,
} from "@genspire/data-mikroorm";
import { serverExtension, Server, rateLimitMiddleware, type RateLimitOptions } from "@genspire/server";
import { swaggerExtension } from "@genspire/swagger";
import { authExtension, AuthConfiguration, authServerMiddlewares, authServerExtension } from "@genspire/auth";
import { storageExtension, StorageDbContext, storageServerExtension } from "@genspire/storage";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { PlaygroundAuthUserEntity } from "./auth/playground-auth-user.entity.js";
import { createPlaygroundAuthSeeder } from "./auth/auth-seeder.js";
import { AiProviderRuntimeCatalogue, seedAiProviders } from "@genspire/ai/application";
import { AiProviderDbContext } from "@genspire/ai/infrastructure";
import { readPlaygroundEnv, type IPlaygroundEnv } from "./config/playground-env.js";
import {
  createPlaygroundMikroOrmConfig,
} from "./database/playground-database-config.js";
import { aiExtension } from "@genspire/ai/extension";
import { aiServerExtension } from "@genspire/ai/server";
import { PlaygroundDbContext } from "./database/playground-db-context.js";
import { createPlaygroundStorageProvider } from "./storage/playground-storage-provider.js";
import { AuthActivityController } from "./auth/auth-activity.controller.js";
import { AuthBanController } from "./auth/auth-ban.controller.js";
import { AiPromptController } from "./ai/prompts/ai-prompt.controller.js";
import { AiPromptEventSubscriber } from "./ai/prompts/ai-prompt.event-subscriber.js";
import { createPlaygroundAiPromptSeeder } from "./ai/prompts/ai-prompt.seeder.js";
import { AiSkillController } from "./ai/skills/ai-skill.controller.js";
import { HealthController } from "./health/health.controller.js";
import { TodoController } from "./todos/todo.controller.js";

export interface PlaygroundAppOptions {
  port?: number;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
  rateLimit?: RateLimitOptions;
}

function isAllowedLocalhostOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:")
      && (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export async function createPlaygroundApp(
  options: PlaygroundAppOptions = {},
) {
  const app = createApp();
  const playgroundEnv = readPlaygroundEnv(options.env ?? process.env as Record<string, string | undefined>);

  await app.use(
    dataExtension({
      runSeedersOnStart: false,
    }),
  );

  const repoRoot = options.repoRoot ?? process.cwd();
  const storageDir = path.resolve(repoRoot, playgroundEnv.storage.localRoot);
  mkdirSync(storageDir, { recursive: true });

  await app.use(
    storageExtension({
      provider: createPlaygroundStorageProvider(playgroundEnv),
    }),
  );

  app.registerScoped(StorageDbContext, PlaygroundDbContext);

  await app.use(
    mikroOrmExtension(
      await createPlaygroundMikroOrmConfig(playgroundEnv, repoRoot),
    ),
  );

  await app.use(
    authExtension({
      userEntity: PlaygroundAuthUserEntity,
      jwtSecret: playgroundEnv.auth.jwtSecret,
      issuer: playgroundEnv.auth.issuer,
      audience: playgroundEnv.auth.audience,
    }),
  );

  const aiProviderCatalogue = AiProviderRuntimeCatalogue.createDefault(
    options.env ?? (process.env as Record<string, string | undefined>),
  );

  await app.use(
    aiExtension({
      clients: aiProviderCatalogue.createClients(),
      defaults: aiProviderCatalogue.getDefaults(),
      providerCatalogue: aiProviderCatalogue,
    }),
  );

  await app.use({
    name: "playground-ai-prompt-events",
    dependsOn: ["ai"] as const,
    register(currentApp) {
      currentApp.registerScoped(AiPromptEventSubscriber);
    },
    start(currentApp) {
      registerEventSubscribers(
        currentApp.container,
        currentApp.get(EventBus),
        [AiPromptEventSubscriber],
      );
    },
  });

  const seeder = createPlaygroundAuthSeeder({ env: playgroundEnv });
  const promptSeeder = createPlaygroundAiPromptSeeder();

  await app.use({
    name: "playground-schema",
    dependsOn: ["data-mikroorm", "auth"],
    async start(currentApp) {
      const orm = currentApp.get(MikroOrmService).getOrm();

      if (playgroundEnv.database.schemaMode === "update") {
        // Playground-only schema sync. Production deployments should use migrations.
        await orm.schema.update();
      } else if (playgroundEnv.database.schemaMode === "migrations") {
        await currentApp.get(MikroOrmMigrationRunner).up();
      }

      await seeder.run(orm.em.fork());
      await promptSeeder.run(orm.em.fork());

      const aiSeedScope = currentApp.createScope();
      try {
        await seedAiProviders(
          aiSeedScope.resolve(AiProviderDbContext),
          aiProviderCatalogue.createSeedInputs(),
        );
      } finally {
        await aiSeedScope.destroy();
      }
    },
  });

  const authConfig = app.get(AuthConfiguration);

  await app.use(
    serverExtension({
      port: options.port ?? playgroundEnv.port,
      idleTimeout: 120,
      trustProxy: true,
      cors: {
        origin: isAllowedLocalhostOrigin,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
        headers: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400,
      },
      middlewares: [
        rateLimitMiddleware({ windowMs: 60_000, max: 120, ...options.rateLimit }),
        ...authServerMiddlewares(authConfig),
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

  await app.use(authServerExtension());

  await app.use(storageServerExtension());
  await app.use(aiServerExtension({ routePrefix: "/api/v1" }));

  const server = app.get(Server);

  server.group("/api/v1", () => {
    server.registerControllers(AiPromptController, AiSkillController);
  });

  server.registerControllers(
    HealthController,
    AuthActivityController,
    AuthBanController,
    TodoController,
  );

  return app;
}

export const playgroundApp = defineApp({
  key: "apps/playground-api",
  async create() {
    return await createPlaygroundApp();
  },
});
