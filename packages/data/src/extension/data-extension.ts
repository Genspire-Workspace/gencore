import type { GenExtension } from "@genspire/core";
import { LoggerFactory } from "@genspire/core";
import { DataSourceRegistry, type DataSource } from "../contracts/data-source.js";
import type { Seeder } from "../seeding/seeder.js";
import { SeederRunner } from "../seeding/seeder-runner.js";

export interface DataExtensionOptions {
  sources?: readonly DataSource[];
  seeders?: readonly Seeder[];
  runSeedersOnStart?: boolean;
}

export function dataExtension(options: DataExtensionOptions = {}): GenExtension {
  const sources = options.sources ?? [];
  const seeders = options.seeders ?? [];

  return {
    name: "data",

    register(app) {
      app.provide(DataSourceRegistry, new DataSourceRegistry(sources));
      app.provide(
        SeederRunner,
        new SeederRunner({
          seeders,
          loggerFactory: app.get(LoggerFactory),
        }),
      );
    },

    async start(app) {
      for (const source of app.get(DataSourceRegistry).list()) {
        await source.connect?.();
      }

      if (options.runSeedersOnStart !== false) {
        await app.get(SeederRunner).run();
      }
    },

    async stop(app) {
      const sourcesToStop = [...app.get(DataSourceRegistry).list()].reverse();
      for (const source of sourcesToStop) {
        await source.disconnect?.();
      }
    },
  };
}
