// file: packages\data\src\extension\data-extension.test.ts

import { describe, expect, test } from "bun:test";
import { createApp } from "@genspire/core";
import { DataSourceRegistry } from "../contracts/data-source.js";
import { SeederRunner } from "../seeding/seeder-runner.js";
import { dataExtension } from "./data-extension.js";

describe("dataExtension", () => {
  test("connects sources on start", async () => {
    const calls: string[] = [];
    const app = createApp();

    await app.use(
      dataExtension({
        sources: [
          {
            name: "one",
            async connect() {
              calls.push("one:connect");
            },
          },
          {
            name: "two",
            async connect() {
              calls.push("two:connect");
            },
          },
        ],
        runSeedersOnStart: false,
      }),
    );

    await app.start();

    expect(calls).toEqual(["one:connect", "two:connect"]);
    expect(app.get(DataSourceRegistry).list()).toHaveLength(2);
  });

  test("disconnects sources in reverse order on stop", async () => {
    const calls: string[] = [];
    const app = createApp();

    await app.use(
      dataExtension({
        sources: [
          {
            name: "one",
            async disconnect() {
              calls.push("one:disconnect");
            },
          },
          {
            name: "two",
            async disconnect() {
              calls.push("two:disconnect");
            },
          },
        ],
        runSeedersOnStart: false,
      }),
    );

    await app.start();
    await app.stop();

    expect(calls).toEqual(["two:disconnect", "one:disconnect"]);
  });

  test("runs seeders when enabled", async () => {
    const calls: string[] = [];
    const app = createApp();

    await app.use(
      dataExtension({
        seeders: [
          {
            name: "alpha",
            run() {
              calls.push("alpha");
            },
          },
          {
            name: "beta",
            run() {
              calls.push("beta");
            },
          },
        ],
      }),
    );

    await app.start();

    expect(calls).toEqual(["alpha", "beta"]);
    expect(app.get(SeederRunner).hasExecuted()).toBe(true);
  });

  test("does not run seeders when disabled", async () => {
    const calls: string[] = [];
    const app = createApp();

    await app.use(
      dataExtension({
        seeders: [
          {
            name: "alpha",
            run() {
              calls.push("alpha");
            },
          },
        ],
        runSeedersOnStart: false,
      }),
    );

    await app.start();

    expect(calls).toEqual([]);
    expect(app.get(SeederRunner).hasExecuted()).toBe(false);
  });
});
