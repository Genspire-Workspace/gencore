// file: packages\data-mikroorm\src\migrations\migration-command-types.ts

import type { MikroOrmExtensionOptions } from "../extension/mikro-orm-extension.js";

export type MikroOrmMigrationCommand =
  | "create"
  | "up"
  | "down"
  | "pending"
  | "executed";

export interface RunMikroOrmMigrationCommandOptions {
  command?: string;
  config: () => Promise<MikroOrmExtensionOptions> | MikroOrmExtensionOptions;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  write?: (message: string) => void;
}
