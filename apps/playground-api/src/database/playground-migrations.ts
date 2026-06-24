// file: apps\playground-api\src\database\playground-migrations.ts

import { runMikroOrmMigrationCommand } from "@genspire/data-mikroorm";
import { readPlaygroundEnv } from "../config/playground-env.js";
import { createPlaygroundMikroOrmConfig } from "./playground-database-config.js";

await runMikroOrmMigrationCommand({
  command: process.argv[2],
  config: () => {
    const env = readPlaygroundEnv(process.env);
    return createPlaygroundMikroOrmConfig(env, process.cwd());
  },
});
