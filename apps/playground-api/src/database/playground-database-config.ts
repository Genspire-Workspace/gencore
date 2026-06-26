// file: apps\playground-api\src\database\playground-database-config.ts

import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { MikroOrmExtensionOptions } from "@genspire/data-mikroorm";
import { Migrator } from "@mikro-orm/migrations";
import { AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity, AuthEventEntity, AuthBannedIpEntity } from "@genspire/auth";
import { FileEntity } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";
import { AiSessionEntity } from "../ai/ai-session.entity.js";
import { AiSessionMessageEntity } from "../ai/ai-session-message.entity.js";
import { PlaygroundAuthUserEntity } from "../auth/playground-auth-user.entity.js";
import type { IPlaygroundEnv } from "../config/playground-env.js";

export type PlaygroundSchemaMode = "update" | "migrations" | "none";

export function resolvePlaygroundDataDirectory(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "data");
}

export function resolvePlaygroundMigrationsPath(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot, "apps", "playground-api", "src", "migrations");
}

function parsePostgresUrl(url: string): { host: string; port: number; user: string; password: string; dbName: string } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "5432", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    dbName: u.pathname.replace(/^\//, ""),
  };
}

export async function createPlaygroundMikroOrmConfig(
  env: IPlaygroundEnv,
  repoRoot = process.cwd(),
): Promise<MikroOrmExtensionOptions> {
  const dbConfig = env.database;
  const runtimeDriver = dbConfig.provider === "postgres" ? "postgresql" as const : "libsql" as const;

  const entities = [FileEntity, TodoEntity, AiSessionEntity, AiSessionMessageEntity, PlaygroundAuthUserEntity, AuthRefreshTokenEntity, AuthRoleEntity, AuthUserRoleEntity, AuthEventEntity, AuthBannedIpEntity];

  const baseOptions = {
    runtimeDriver,
    entities,
    allowGlobalContext: true,
    debug: false,
    extensions: [Migrator],
  } satisfies Partial<MikroOrmExtensionOptions>;

  if (runtimeDriver === "libsql") {
    const dbPath = path.resolve(repoRoot, dbConfig.libsqlDbPath);
    await mkdir(path.dirname(dbPath), { recursive: true });

    return {
      ...baseOptions,
      entities,
      dbName: dbPath,
    } as unknown as MikroOrmExtensionOptions;
  }

  const pg = parsePostgresUrl(dbConfig.postgresUrl);

  const migrationsPath = resolvePlaygroundMigrationsPath(repoRoot);
  await mkdir(migrationsPath, { recursive: true });

  return {
    ...baseOptions,
    entities,
    host: pg.host,
    port: pg.port,
    user: pg.user,
    password: pg.password,
    dbName: pg.dbName,
    migrations: {
      path: migrationsPath,
      pathTs: migrationsPath,
      glob: "!(*.d).{js,ts}",
      transactional: true,
      disableForeignKeys: false,
    },
  } as unknown as MikroOrmExtensionOptions;
}
