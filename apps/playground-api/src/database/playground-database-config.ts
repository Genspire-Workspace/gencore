import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { MikroOrmExtensionOptions } from "@genspire/data-mikroorm";
import { TodoEntity } from "../todos/todo.entity.js";

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

export async function createPlaygroundMikroOrmConfig(
  repoRoot = process.cwd(),
  env = process.env,
): Promise<MikroOrmExtensionOptions> {
  const dbName = resolvePlaygroundLibsqlDbPath(repoRoot, env);
  await ensurePlaygroundLibsqlDirectory(dbName);

  return {
    runtimeDriver: "libsql",
    entities: [TodoEntity],
    dbName,
    allowGlobalContext: true,
    debug: false,
  };
}
