// file: packages\data-mikroorm\src\migrations\migration-command-runner.ts

import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import { mikroOrmExtension } from "../extension/mikro-orm-extension.js";
import { MikroOrmMigrationRunner } from "./migration-runner.js";
import type {
  MikroOrmMigrationCommand,
  RunMikroOrmMigrationCommandOptions,
} from "./migration-command-types.js";

export function isMikroOrmMigrationCommand(
  value: string | undefined,
): value is MikroOrmMigrationCommand {
  return value === "create"
    || value === "up"
    || value === "down"
    || value === "pending"
    || value === "executed";
}

export function formatMikroOrmMigrationCommandResult(result: unknown): string {
  if (result === undefined) {
    return "Done.";
  }

  if (typeof result === "string") {
    return result;
  }

  if (typeof result === "object" && result !== null) {
    return JSON.stringify(result, null, 2);
  }

  return String(result);
}

export async function runMikroOrmMigrationCommand(
  options: RunMikroOrmMigrationCommandOptions,
): Promise<void> {
  if (!isMikroOrmMigrationCommand(options.command)) {
    throw new Error(
      "Invalid MikroORM migration command. Use one of: create, up, down, pending, executed.",
    );
  }

  const write = options.write ?? console.log;
  const app = createApp();

  await app.use(dataExtension({ runSeedersOnStart: false }));
  await app.use(mikroOrmExtension(await options.config()));
  await app.start();

  try {
    const runner = app.get(MikroOrmMigrationRunner);
    let result: unknown;

    switch (options.command) {
      case "create":
        result = await runner.create();
        break;
      case "up":
        result = await runner.up();
        break;
      case "down":
        result = await runner.down();
        break;
      case "pending":
        result = await runner.pending();
        break;
      case "executed":
        result = await runner.executed();
        break;
    }

    write(formatMikroOrmMigrationCommandResult(result));
  } finally {
    await app.stop();
  }
}
