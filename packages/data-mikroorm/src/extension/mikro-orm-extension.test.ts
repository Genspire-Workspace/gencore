// file: packages\data-mikroorm\src\extension\mikro-orm-extension.test.ts

import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import { MikroORM as MikroOrmLibsql } from "@mikro-orm/libsql";
import { MikroORM as MikroOrmRuntime } from "@mikro-orm/postgresql";
import { EntityManagerProvider } from "../context/entity-manager-provider.js";
import { MikroOrmMigrationRunner } from "../migrations/migration-runner.js";
import {
  MikroOrmService,
  mikroOrmExtension,
  type MikroOrmExtensionOptions,
} from "./mikro-orm-extension.js";

const options: MikroOrmExtensionOptions = {
  entities: [],
  dbName: "test",
  host: "localhost",
  port: 5432,
  user: "user",
  password: "password",
  allowGlobalContext: true,
};

describe("mikroOrmExtension", () => {
  beforeEach(() => {
    spyOn(MikroOrmRuntime, "init").mockRestore();
    spyOn(MikroOrmLibsql, "init").mockRestore();
  });

  test("requires the data extension through dependsOn", async () => {
    const app = createApp();

    await expect(app.use(mikroOrmExtension(options))).rejects.toThrow(
      "depends on 'data'",
    );
  });

  test("registers MikroOrmService", async () => {
    const app = createApp();
    await app.use(dataExtension({ runSeedersOnStart: false }));
    await app.use(mikroOrmExtension(options));

    expect(app.get(MikroOrmService)).toBeInstanceOf(MikroOrmService);
    expect(app.get(EntityManagerProvider)).toBeInstanceOf(EntityManagerProvider);
    expect(app.get(MikroOrmMigrationRunner)).toBeInstanceOf(MikroOrmMigrationRunner);
  });

  test("MikroOrmService.getOrm() throws before start", () => {
    const service = new MikroOrmService(options);

    expect(() => service.getOrm()).toThrow("MikroORM has not been initialized.");
  });

  test("MikroOrmMigrationRunner throws before orm start", () => {
    const service = new MikroOrmService(options);
    const runner = new MikroOrmMigrationRunner(service);

    expect(() => runner.getMigrator()).toThrow("MikroORM has not been initialized.");
  });

  test("MikroOrmMigrationRunner throws without migrator support", () => {
    const service = {
      getOrm: () => ({}),
    } as unknown as MikroOrmService;
    const runner = new MikroOrmMigrationRunner(service);

    expect(() => runner.getMigrator()).toThrow("MikroORM migrator is not available");
  });

  test("initializes and closes MikroORM through extension lifecycle", async () => {
    const close = mock(async () => {});
    const initSpy = spyOn(MikroOrmRuntime, "init").mockResolvedValue({
      em: { fork: () => ({}) },
      close,
    } as unknown as Awaited<ReturnType<typeof MikroOrmRuntime.init>>);

    const app = createApp();
    await app.use(dataExtension({ runSeedersOnStart: false }));
    await app.use(mikroOrmExtension(options));

    await app.start();
    expect(initSpy).toHaveBeenCalledTimes(1);

    await app.stop();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("initializes libsql when requested", async () => {
    const close = mock(async () => {});
    const initSpy = spyOn(MikroOrmLibsql, "init").mockResolvedValue({
      em: { fork: () => ({}) },
      close,
    } as unknown as Awaited<ReturnType<typeof MikroOrmLibsql.init>>);

    const app = createApp();
    await app.use(dataExtension({ runSeedersOnStart: false }));
    await app.use(
      mikroOrmExtension({
        ...options,
        runtimeDriver: "libsql",
      }),
    );

    await app.start();
    expect(initSpy).toHaveBeenCalledTimes(1);

    await app.stop();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("runs migrations on start when enabled", async () => {
    const up = mock(async () => []);
    const close = mock(async () => {});
    spyOn(MikroOrmRuntime, "init").mockResolvedValue({
      em: { fork: () => ({}) },
      close,
      getMigrator: () => ({
        create: mock(async () => ({
          fileName: "migration.ts",
          code: "",
          diff: { up: [], down: [] },
        })),
        getPending: mock(async () => []),
        getExecuted: mock(async () => []),
        up,
        down: mock(async () => []),
      }),
    } as unknown as Awaited<ReturnType<typeof MikroOrmRuntime.init>>);

    const app = createApp();
    await app.use(dataExtension({ runSeedersOnStart: false }));
    await app.use(mikroOrmExtension({
      ...options,
      runMigrationsOnStart: true,
    }));

    await app.start();
    expect(up).toHaveBeenCalledTimes(1);

    await app.stop();
  });
});
