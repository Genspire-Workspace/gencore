import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import { MikroORM as MikroOrmLibsql } from "@mikro-orm/libsql";
import { MikroORM as MikroOrmRuntime } from "@mikro-orm/postgresql";
import { EntityManagerProvider } from "../context/entity-manager-provider.js";
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
  });

  test("MikroOrmService.getOrm() throws before start", () => {
    const service = new MikroOrmService(options);

    expect(() => service.getOrm()).toThrow("MikroORM has not been initialized.");
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
});
