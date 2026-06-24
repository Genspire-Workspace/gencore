import { runMikroOrmMigrationCommand } from "@genspire/data-mikroorm";
import { createPlaygroundMikroOrmConfig } from "./playground-database-config.js";

await runMikroOrmMigrationCommand({
  command: process.argv[2],
  config: () => createPlaygroundMikroOrmConfig(process.cwd(), process.env),
});
