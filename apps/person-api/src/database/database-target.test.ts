import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  resolveDatabaseTarget,
  resolveDefaultLibsqlDbPath,
  resolvePersonApiDataDirectory,
} from "./database-target.js";

describe("person-api database target", () => {
  test("defaults to libsql", () => {
    expect(resolveDatabaseTarget(undefined)).toBe("libsql");
  });

  test("rejects invalid target", () => {
    expect(() => resolveDatabaseTarget("mysql")).toThrow(
      "Invalid GENCORE_DATABASE_TARGET",
    );
  });

  test("libsql path resolves under data/person-api.db", () => {
    expect(resolveDefaultLibsqlDbPath()).toBe(
      path.resolve(resolvePersonApiDataDirectory(), "person-api.db"),
    );
  });
});
