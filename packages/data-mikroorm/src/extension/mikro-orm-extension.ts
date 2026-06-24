// file: packages\data-mikroorm\src\extension\mikro-orm-extension.ts

import type { GenExtension } from "@genspire/core";
import type { Options, EntityManager, MikroORM } from "@mikro-orm/core";
import { MikroORM as MikroOrmLibsql } from "@mikro-orm/libsql";
import { MikroORM as MikroOrmRuntime } from "@mikro-orm/postgresql";
import { EntityManagerProvider } from "../context/entity-manager-provider.js";
import { MikroOrmMigrationRunner } from "../migrations/migration-runner.js";

export type MikroOrmDriver = "postgresql" | "libsql";

export type MikroOrmExtensionOptions = Partial<Options> & {
  runtimeDriver?: MikroOrmDriver;
  runMigrationsOnStart?: boolean;
  entities: NonNullable<Options["entities"]>;
};

export class MikroOrmService {
  private orm?: MikroORM;

  constructor(private readonly options: MikroOrmExtensionOptions) {}

  async start(): Promise<void> {
    const driver = this.options.runtimeDriver ?? "postgresql";
    const initOptions = { ...this.options };
    delete initOptions.runtimeDriver;
    delete initOptions.runMigrationsOnStart;

    this.orm =
      driver === "libsql"
        ? await MikroOrmLibsql.init(initOptions)
        : await MikroOrmRuntime.init(initOptions);
  }

  getOrm(): MikroORM {
    if (!this.orm) {
      throw new Error("MikroORM has not been initialized.");
    }

    return this.orm;
  }

  getEntityManager(): MikroORM["em"] & EntityManager {
    return this.getOrm().em;
  }

  async stop(): Promise<void> {
    await this.orm?.close(true);
    this.orm = undefined;
  }
}

export function mikroOrmExtension(options: MikroOrmExtensionOptions): GenExtension {
  return {
    name: "data-mikroorm",
    dependsOn: ["data"],

    register(app) {
      const service = new MikroOrmService(options);
      const migrationRunner = new MikroOrmMigrationRunner(service);
      app.provide(MikroOrmService, service);
      app.provide(EntityManagerProvider, new EntityManagerProvider(service));
      app.provide(MikroOrmMigrationRunner, migrationRunner);
    },

    async start(app) {
      const service = app.get(MikroOrmService);
      await service.start();

      if (options.runMigrationsOnStart) {
        await app.get(MikroOrmMigrationRunner).up();
      }
    },

    async stop(app) {
      await app.get(MikroOrmService).stop();
    },
  };
}
