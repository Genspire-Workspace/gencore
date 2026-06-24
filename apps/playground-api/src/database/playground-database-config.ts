import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { MikroOrmExtensionOptions } from "@genspire/data-mikroorm";
import { Migrator } from "@mikro-orm/migrations";
import { AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity } from "@genspire/auth";
import { TodoEntity } from "../todos/todo.entity.js";
import { PlaygroundAuthUserEntity } from "../auth/playground-auth-user.entity.js";

export type PlaygroundSchemaMode = "update" | "migrations" | "none";

export function resolvePlaygroundDataDirectory(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "data");
}

export function resolveDefaultPlaygroundLibsqlDbPath(repoRoot = process.cwd()): string {
  return path.resolve(resolvePlaygroundDataDirectory(repoRoot), "playground-api.db");
}

export async function ensurePlaygroundLibsqlDirectory(dbPath: string): Promise<void> {
  await mkdir(path.dirname(dbPath), { recursive: true });
}

export function resolvePlaygroundLibsqlDbPath(
  repoRoot = process.cwd(),
  env = process.env,
): string {
  return env["GENCORE_PLAYGROUND_LIBSQL_DB_PATH"]?.trim()
    || resolveDefaultPlaygroundLibsqlDbPath(repoRoot);
}

export function resolvePlaygroundMigrationsPath(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "apps", "playground-api", "src", "migrations");
}

export function resolvePlaygroundSchemaMode(
  env = process.env,
): PlaygroundSchemaMode {
  const value = env["GENCORE_PLAYGROUND_SCHEMA_MODE"]?.trim() ?? "update";

  if (value === "update" || value === "migrations" || value === "none") {
    return value;
  }

  throw new Error(
    `Invalid GENCORE_PLAYGROUND_SCHEMA_MODE: '${value}'. Expected one of: update, migrations, none.`,
  );
}

export async function createPlaygroundMikroOrmConfig(
  repoRoot = process.cwd(),
  env = process.env,
): Promise<MikroOrmExtensionOptions> {
  const dbName = resolvePlaygroundLibsqlDbPath(repoRoot, env);
  await ensurePlaygroundLibsqlDirectory(dbName);
  const migrationsPath = resolvePlaygroundMigrationsPath(repoRoot);
  await mkdir(migrationsPath, { recursive: true });

  return {
    runtimeDriver: "libsql",
    entities: [TodoEntity, PlaygroundAuthUserEntity, AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity],
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
