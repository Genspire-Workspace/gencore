// file: apps\playground-api\src\database\playground-database-config.ts

import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { MikroOrmExtensionOptions } from "@genspire/data-mikroorm";
import { Migrator } from "@mikro-orm/migrations";
import { AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity, AuthEventEntity, AuthBannedIpEntity } from "@genspire/auth";
import { FileEntity } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";
import { PlaygroundAuthUserEntity } from "../auth/playground-auth-user.entity.js";
import type { IPlaygroundEnv } from "../config/playground-env.js";

export type PlaygroundSchemaMode = "update" | "migrations" | "none";

export function resolvePlaygroundDataDirectory(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "data");
}

export function resolvePlaygroundMigrationsPath(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "apps", "playground-api", "src", "migrations");
}

export async function createPlaygroundMikroOrmConfig(
  env: IPlaygroundEnv,
  repoRoot = process.cwd(),
): Promise<MikroOrmExtensionOptions> {
  const dbConfig = env.database;
  const runtimeDriver = dbConfig.provider === "postgres" ? "postgresql" as const : "libsql" as const;

  const dbName = runtimeDriver === "libsql"
    ? path.resolve(repoRoot, dbConfig.libsqlDbPath)
    : dbConfig.postgresUrl;

  if (runtimeDriver === "libsql") {
    await mkdir(path.dirname(dbName), { recursive: true });
  }

  const migrationsPath = resolvePlaygroundMigrationsPath(repoRoot);
  await mkdir(migrationsPath, { recursive: true });

  return {
    runtimeDriver,
    entities: [FileEntity, TodoEntity, PlaygroundAuthUserEntity, AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity, AuthEventEntity, AuthBannedIpEntity],
    dbName,
    allowGlobalContext: true,
    debug: false,
    extensions: [Migrator],
    migrations: {
      path: migrationsPath,
      pathTs: migrationsPath,
      glob: "!(*.d).{js,ts}",
      transactional: true,
      disableForeignKeys: false,
    },
  };
}
