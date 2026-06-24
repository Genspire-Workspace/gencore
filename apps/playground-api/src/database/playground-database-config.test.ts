import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  createPlaygroundMikroOrmConfig,
  resolveDefaultPlaygroundLibsqlDbPath,
  resolvePlaygroundLibsqlDbPath,
  resolvePlaygroundMigrationsPath,
  resolvePlaygroundSchemaMode,
} from "./playground-database-config.js";

describe("playground database config", () => {
  const repoRoot = "C:\\Users\\PC\\Documents\\GitHub\\Gencore";

  test("defaults to the playground libsql database path", () => {
    expect(resolveDefaultPlaygroundLibsqlDbPath(repoRoot)).toBe(
      path.resolve(repoRoot, "data", "playground-api.db"),
    );
  });

  test("uses the environment override when provided", () => {
    expect(
      resolvePlaygroundLibsqlDbPath("C:\\repo", {
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: "C:\\custom\\playground.db",
      }),
    ).toBe("C:\\custom\\playground.db");
  });

  test("resolves the playground migrations path", () => {
    expect(resolvePlaygroundMigrationsPath(repoRoot)).toBe(
      path.resolve(repoRoot, "apps", "playground-api", "src", "migrations"),
    );
  });

  test("schema mode defaults to update", () => {
    expect(resolvePlaygroundSchemaMode({})).toBe("update");
  });

  test("schema mode accepts supported values", () => {
    expect(resolvePlaygroundSchemaMode({ GENCORE_PLAYGROUND_SCHEMA_MODE: "update" })).toBe("update");
    expect(resolvePlaygroundSchemaMode({ GENCORE_PLAYGROUND_SCHEMA_MODE: "migrations" })).toBe("migrations");
    expect(resolvePlaygroundSchemaMode({ GENCORE_PLAYGROUND_SCHEMA_MODE: "none" })).toBe("none");
  });

  test("schema mode rejects invalid values", () => {
    expect(() => resolvePlaygroundSchemaMode({
      GENCORE_PLAYGROUND_SCHEMA_MODE: "invalid",
    })).toThrow("Invalid GENCORE_PLAYGROUND_SCHEMA_MODE");
  });

  test("mikro orm config includes app-owned migrations", async () => {
    const config = await createPlaygroundMikroOrmConfig(repoRoot, {});

    expect(config.migrations).toBeDefined();
    expect(config.migrations?.path).toBe(
      path.resolve(repoRoot, "apps", "playground-api", "src", "migrations"),
    );
    expect(config.migrations?.pathTs).toBe(
      path.resolve(repoRoot, "apps", "playground-api", "src", "migrations"),
    );
  });
});
