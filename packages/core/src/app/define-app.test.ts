// file: packages/core/src/app/define-app.test.ts

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "./create-app.js";
import { defineApp } from "./define-app.js";

describe("defineApp", () => {
  const appKey = "packages/core/define-app.test";
  let calls: string[];

  beforeEach(() => {
    calls = [];
  });

  afterEach(async () => {
    await defineApp({
      key: appKey,
      create: () => createApp(),
      registerProcessHandlers: false,
    }).stop();
  });

  test("run restarts the keyed app lifecycle", async () => {
    const firstApp = defineApp({
      key: appKey,
      registerProcessHandlers: false,
      async create() {
        const app = createApp();
        await app.use({
          name: "first",
          start() {
            calls.push("first:start");
          },
          stop() {
            calls.push("first:stop");
          },
        });
        return app;
      },
    });

    const secondApp = defineApp({
      key: appKey,
      registerProcessHandlers: false,
      async create() {
        const app = createApp();
        await app.use({
          name: "second",
          start() {
            calls.push("second:start");
          },
          stop() {
            calls.push("second:stop");
          },
        });
        return app;
      },
    });

    await firstApp.run();
    await secondApp.run();

    expect(calls).toEqual([
      "first:start",
      "first:stop",
      "second:start",
    ]);
  });

  test("create builds an app without starting it", async () => {
    const app = await defineApp({
      key: appKey,
      registerProcessHandlers: false,
      async create() {
        const createdApp = createApp();
        await createdApp.use({
          name: "demo",
          start() {
            calls.push("demo:start");
          },
        });
        return createdApp;
      },
    }).create();

    expect(calls).toEqual([]);

    await app.start();
    await app.stop();

    expect(calls).toEqual(["demo:start"]);
  });
});
