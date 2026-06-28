// file: apps\playground-api\src\playground-app.ts

import { createApp } from "@genspire/core";
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
import { seedAiProviders } from "@genspire/ai/application";
import { AiProviderDbContext } from "@genspire/ai/infrastructure";
import { readPlaygroundEnv, type IPlaygroundEnv } from "./config/playground-env.js";
import {
  createPlaygroundMikroOrmConfig,
} from "./database/playground-database-config.js";
import { aiExtension } from "@genspire/ai/extension";
import { aiServerExtension } from "@genspire/ai/server";
import { OpenAICompatibleClient } from "@genspire/ai/providers/openai-compatible";
import { PlaygroundDbContext } from "./database/playground-db-context.js";
import { createPlaygroundStorageProvider } from "./storage/playground-storage-provider.js";
import { AuthActivityController } from "./auth/auth-activity.controller.js";
import { AuthBanController } from "./auth/auth-ban.controller.js";
import { AiProviderController } from "./ai/providers/ai-provider.controller.js";
import { createAiPlaygroundProviderDefinitions } from "./ai/providers/ai-provider-definition.js";
import { AiPromptController } from "./ai/prompts/ai-prompt.controller.js";
import { AiSkillController } from "./ai/skills/ai-skill.controller.js";
import { HealthController } from "./health/health.controller.js";
import { TodoController } from "./todos/todo.controller.js";

export interface PlaygroundAppOptions {
  port?: number;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
  rateLimit?: RateLimitOptions;
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

  const providerDefinitions = createAiPlaygroundProviderDefinitions();
  const aiClients = providerDefinitions
    .filter((provider) => provider.client)
    .map((provider) => new OpenAICompatibleClient({
      id: provider.id,
      name: provider.name,
      ...provider.client!,
    }));

  await app.use(
    aiExtension({
      clients: aiClients,
      defaults: {
        chatProvider: process.env.AI_CHAT_PROVIDER ?? "ollama",
        chatModel: process.env.AI_CHAT_MODEL ?? process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
        embeddingProvider: process.env.AI_EMBEDDING_PROVIDER ?? "ollama",
        embeddingModel: process.env.AI_EMBEDDING_MODEL ?? process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
      },
    }),
  );

  if (playgroundEnv.database.schemaMode !== "none") {
    const seeder = createPlaygroundAuthSeeder({ env: playgroundEnv });

    await app.use({
      name: "playground-schema",
      dependsOn: ["data-mikroorm", "auth"],
      async start(currentApp) {
        const orm = currentApp.get(MikroOrmService).getOrm();

        if (playgroundEnv.database.schemaMode === "update") {
          // Playground-only schema sync. Production deployments should use migrations.
          await orm.schema.update();
        } else {
          await currentApp.get(MikroOrmMigrationRunner).up();
        }

        await seeder.run(orm.em.fork());

        const aiSeedScope = currentApp.createScope();
        try {
          await seedAiProviders(aiSeedScope.resolve(AiProviderDbContext));
        } finally {
          await aiSeedScope.destroy();
        }
      },
    });
  }

  const authConfig = app.get(AuthConfiguration);

  await app.use(
    serverExtension({
      port: options.port ?? playgroundEnv.port,
      idleTimeout: 120,
      trustProxy: true,
      cors: {
        origin: [
          "http://localhost:4200",
          "http://127.0.0.1:4200",
        ],
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

  app.get(Server).registerControllers(HealthController, AiProviderController, AiPromptController, AiSkillController, AuthActivityController, AuthBanController, TodoController);

  return app;
}
