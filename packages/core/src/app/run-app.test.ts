// file: packages/core/src/app/run-app.test.ts

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "./create-app.js";
import { runApp, stopApp } from "./run-app.js";

describe("runApp", () => {
  const appKey = "packages/core/run-app.test";
  let calls: string[];

  beforeEach(() => {
    calls = [];
  });

  afterEach(async () => {
    await stopApp({
      key: appKey,
      registerProcessHandlers: false,
    });
  });

  test("replaces the active app for the same key", async () => {
    await runApp(async () => {
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
    }, {
      key: appKey,
      registerProcessHandlers: false,
    });

    await runApp(async () => {
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
    }, {
      key: appKey,
      registerProcessHandlers: false,
    });

    expect(calls).toEqual([
      "first:start",
      "first:stop",
      "second:start",
    ]);
  });

  test("stopApp stops the active app", async () => {
    await runApp(async () => {
      const app = createApp();

      await app.use({
        name: "demo",
        start() {
          calls.push("demo:start");
        },
        stop() {
          calls.push("demo:stop");
        },
      });

      return app;
    }, {
      key: appKey,
      registerProcessHandlers: false,
    });

    await stopApp({
      key: appKey,
      registerProcessHandlers: false,
    });

    expect(calls).toEqual([
      "demo:start",
      "demo:stop",
    ]);
  });
});
