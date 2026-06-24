import { LoggerFactory } from "@genspire/core";
import type { Seeder } from "./seeder.js";

export interface SeederRunnerOptions {
  seeders?: readonly Seeder[];
  loggerFactory?: LoggerFactory;
}

export class SeederRunner {
  private hasRun = false;

  constructor(private readonly options: SeederRunnerOptions = {}) {}

  list(): readonly Seeder[] {
    return this.options.seeders ?? [];
  }

  hasExecuted(): boolean {
    return this.hasRun;
  }

  reset(): void {
    this.hasRun = false;
  }

  async run(): Promise<void> {
    if (this.hasRun) {
      return;
    }

    const logger = this.options.loggerFactory?.createLogger("SeederRunner");

    for (const seeder of this.options.seeders ?? []) {
      const startedAt = Date.now();

      logger?.info("Seeder started", {
        seeder: seeder.name,
      });

      try {
        await seeder.run();
        logger?.info("Seeder completed", {
          seeder: seeder.name,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        logger?.error("Seeder failed", error, {
          seeder: seeder.name,
          durationMs: Date.now() - startedAt,
        });
        throw error;
      }
    }

    this.hasRun = true;
  }
}
