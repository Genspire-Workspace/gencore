// file: packages\data-mikroorm\src\migrations\migration-command-runner.test.ts

import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { MikroORM as MikroOrmRuntime } from "@mikro-orm/postgresql";
import type { MikroOrmExtensionOptions } from "../extension/mikro-orm-extension.js";
import {
  formatMikroOrmMigrationCommandResult,
  isMikroOrmMigrationCommand,
  runMikroOrmMigrationCommand,
} from "./migration-command-runner.js";

const options: MikroOrmExtensionOptions = {
  entities: [],
  dbName: "test",
  host: "localhost",
  port: 5432,
  user: "user",
  password: "password",
  allowGlobalContext: true,
};

describe("migration command runner", () => {
  beforeEach(() => {
    spyOn(MikroOrmRuntime, "init").mockRestore();
  });

  test("isMikroOrmMigrationCommand accepts valid commands", () => {
    expect(isMikroOrmMigrationCommand("create")).toBe(true);
    expect(isMikroOrmMigrationCommand("up")).toBe(true);
    expect(isMikroOrmMigrationCommand("down")).toBe(true);
    expect(isMikroOrmMigrationCommand("pending")).toBe(true);
    expect(isMikroOrmMigrationCommand("executed")).toBe(true);
  });

  test("isMikroOrmMigrationCommand rejects invalid commands", () => {
    expect(isMikroOrmMigrationCommand(undefined)).toBe(false);
    expect(isMikroOrmMigrationCommand("")).toBe(false);
    expect(isMikroOrmMigrationCommand("drop")).toBe(false);
  });

  test("formats undefined results as Done.", () => {
    expect(formatMikroOrmMigrationCommandResult(undefined)).toBe("Done.");
  });

  test("formats objects and arrays as json", () => {
    expect(formatMikroOrmMigrationCommandResult({ ok: true })).toBe(
      '{\n  "ok": true\n}',
    );
    expect(formatMikroOrmMigrationCommandResult(["a", "b"])).toBe(
      '[\n  "a",\n  "b"\n]',
    );
  });

  test("throws on invalid command", async () => {
    await expect(runMikroOrmMigrationCommand({
      command: "drop",
      config: () => options,
    })).rejects.toThrow(
      "Invalid MikroORM migration command. Use one of: create, up, down, pending, executed.",
    );
  });

  test("dispatches the expected command to the migration runner", async () => {
    const executed = [{ name: "Migration20260624" }];
    const create = mock(async () => ({
      fileName: "migration.ts",
      code: "",
      diff: { up: [], down: [] },
    }));
    const up = mock(async () => []);
    const down = mock(async () => []);
    const pending = mock(async () => []);
    const getExecuted = mock(async () => executed);
    const close = mock(async () => {});
    const write = mock(() => {});

    const initSpy = spyOn(MikroOrmRuntime, "init").mockResolvedValue({
      em: { fork: () => ({}) },
      close,
      getMigrator: () => ({
        create,
        up,
        down,
        getPending: pending,
        getExecuted,
      }),
    } as unknown as Awaited<ReturnType<typeof MikroOrmRuntime.init>>);

    await runMikroOrmMigrationCommand({
      command: "executed",
      config: () => options,
      write,
    });

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(getExecuted).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(0);
    expect(up).toHaveBeenCalledTimes(0);
    expect(down).toHaveBeenCalledTimes(0);
    expect(pending).toHaveBeenCalledTimes(0);
    expect(write).toHaveBeenCalledWith('[\n  {\n    "name": "Migration20260624"\n  }\n]');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
