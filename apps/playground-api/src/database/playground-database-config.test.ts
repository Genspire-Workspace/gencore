// file: apps\playground-api\src\database\playground-database-config.test.ts

import { describe, expect, test } from "bun:test";
import path from "node:path";
import { readPlaygroundEnv } from "../config/playground-env.js";
import {
  createPlaygroundMikroOrmConfig,
  resolvePlaygroundMigrationsPath,
} from "./playground-database-config.js";

describe("playground database config", () => {
  const repoRoot = path.resolve("C:\\Users\\PC\\Documents\\GitHub\\Gencore");

  test("creates libsql config from defaults", async () => {
    const env = readPlaygroundEnv({});
    const config = await createPlaygroundMikroOrmConfig(env, repoRoot);

    expect(config.runtimeDriver).toBe("libsql");
    expect(config.migrations).toBeDefined();
    expect(config.migrations?.path).toBe(
      path.resolve(repoRoot, "apps", "playground-api", "src", "migrations"),
    );
  });

  test("creates postgres config when provider is postgres", async () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_DATABASE_PROVIDER: "postgres",
      GENCORE_PLAYGROUND_POSTGRES_URL: "postgresql://u:p@h/db",
    });
    const config = await createPlaygroundMikroOrmConfig(env, repoRoot);

    expect(config.runtimeDriver).toBe("postgresql");
    expect(config.dbName).toBe("postgresql://u:p@h/db");
  });

  test("uses env override for libsql db path", async () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_LIBSQL_DB_PATH: "C:\\custom\\playground.db",
    });
    const config = await createPlaygroundMikroOrmConfig(env, repoRoot);

    expect(config.dbName).toBe(path.resolve(repoRoot, "C:\\custom\\playground.db"));
  });

  test("resolves the playground migrations path", () => {
    expect(resolvePlaygroundMigrationsPath(repoRoot)).toBe(
      path.resolve(repoRoot, "apps", "playground-api", "src", "migrations"),
    );
  });
});
