import { mkdir } from "node:fs/promises";
import path from "node:path";

export type DatabaseTarget = "libsql" | "postgresql";

export interface PostgresEnvironmentConfig {
  host: string;
  port: number;
  dbName: string;
  user: string;
  password: string;
}

export interface LibsqlEnvironmentConfig {
  dbPath: string;
}

export interface PersonApiDatabaseEnvironment {
  target: DatabaseTarget;
  libsql: LibsqlEnvironmentConfig;
  postgresql: PostgresEnvironmentConfig;
}

function resolveRepositoryRoot(): string {
  return process.cwd();
}

export function resolvePersonApiDataDirectory(): string {
  return path.resolve(resolveRepositoryRoot(), "data");
}

export function resolveDefaultLibsqlDbPath(): string {
  return path.resolve(resolvePersonApiDataDirectory(), "person-api.db");
}

export function resolveDatabaseTarget(value = process.env["GENCORE_DATABASE_TARGET"]): DatabaseTarget {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === "libsql") {
    return "libsql";
  }

  if (normalized === "postgresql") {
    return "postgresql";
  }

  throw new Error(
    `Invalid GENCORE_DATABASE_TARGET '${value}'. Expected 'libsql' or 'postgresql'.`,
  );
}

export async function ensureLibsqlDataDirectory(dbPath: string): Promise<void> {
  await mkdir(path.dirname(dbPath), { recursive: true });
}

export function resolvePersonApiDatabaseEnvironment(): PersonApiDatabaseEnvironment {
  return {
    target: resolveDatabaseTarget(),
    libsql: {
      dbPath:
        process.env["GENCORE_LIBSQL_DB_PATH"]?.trim() || resolveDefaultLibsqlDbPath(),
    },
    postgresql: {
      host: process.env["GENCORE_POSTGRES_HOST"]?.trim() || "localhost",
      port: Number(process.env["GENCORE_POSTGRES_PORT"] ?? "5432"),
      dbName: process.env["GENCORE_POSTGRES_DB"]?.trim() || "gencore_person_api",
      user: process.env["GENCORE_POSTGRES_USER"]?.trim() || "postgres",
      password: process.env["GENCORE_POSTGRES_PASSWORD"]?.trim() || "postgres",
    },
  };
}
