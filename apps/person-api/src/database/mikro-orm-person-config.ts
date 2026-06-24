import type { MikroOrmExtensionOptions } from "@genspire/data-mikroorm";
import { PersonEntity } from "../entities/person.entity.js";
import {
  ensureLibsqlDataDirectory,
  resolvePersonApiDatabaseEnvironment,
} from "./database-target.js";

export async function createPersonApiMikroOrmConfig(): Promise<MikroOrmExtensionOptions> {
  const environment = resolvePersonApiDatabaseEnvironment();

  if (environment.target === "libsql") {
    await ensureLibsqlDataDirectory(environment.libsql.dbPath);

    return {
      runtimeDriver: "libsql",
      entities: [PersonEntity],
      dbName: environment.libsql.dbPath,
      allowGlobalContext: true,
      debug: false,
    };
  }

  return {
    runtimeDriver: "postgresql",
    entities: [PersonEntity],
    host: environment.postgresql.host,
    port: environment.postgresql.port,
    dbName: environment.postgresql.dbName,
    user: environment.postgresql.user,
    password: environment.postgresql.password,
    allowGlobalContext: true,
    debug: false,
  };
}
