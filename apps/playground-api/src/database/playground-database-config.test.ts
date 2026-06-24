import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  resolveDefaultPlaygroundLibsqlDbPath,
  resolvePlaygroundLibsqlDbPath,
} from "./playground-database-config.js";

describe("playground database config", () => {
  test("defaults to the playground libsql database path", () => {
    const repoRoot = "C:\\Users\\PC\\Documents\\GitHub\\Gencore";

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
});
