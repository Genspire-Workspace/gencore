import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createApp } from "./create-app.js";
import type { GenExtension } from "./gen-extension.js";

describe("GenApp extension lifecycle", () => {
  let calls: string[];

  beforeEach(() => {
    calls = [];
  });

  test("duplicate extension names are rejected", async () => {
    const app = createApp();

    await app.use({ name: "demo" });

    await expect(app.use({ name: "demo" })).rejects.toThrow(
      "Extension 'demo' is already registered.",
    );
  });

  test("missing dependsOn is rejected", async () => {
    const app = createApp();

    await expect(
      app.use({
        name: "server",
        dependsOn: ["logging"],
      }),
    ).rejects.toThrow("depends on 'logging'");
  });

  test("register runs immediately during app.use()", async () => {
    const app = createApp();

    await app.use({
      name: "demo",
      register() {
        calls.push("register");
      },
    });

    expect(calls).toEqual(["register"]);
  });

  test("start runs in registration order", async () => {
    const app = createApp();
    const extensions: GenExtension[] = [
      {
        name: "first",
        start() {
          calls.push("first:start");
        },
      },
      {
        name: "second",
        start() {
          calls.push("second:start");
        },
      },
      {
        name: "third",
        start() {
          calls.push("third:start");
        },
      },
    ];

    for (const extension of extensions) {
      await app.use(extension);
    }

    await app.start();

    expect(calls).toEqual(["first:start", "second:start", "third:start"]);
  });

  test("stop runs in reverse registration order", async () => {
    const app = createApp();
    const extensions: GenExtension[] = [
      {
        name: "first",
        stop() {
          calls.push("first:stop");
        },
      },
      {
        name: "second",
        stop() {
          calls.push("second:stop");
        },
      },
      {
        name: "third",
        stop() {
          calls.push("third:stop");
        },
      },
    ];

    for (const extension of extensions) {
      await app.use(extension);
    }

    await app.start();
    await app.stop();

    expect(calls).toEqual(["third:stop", "second:stop", "first:stop"]);
  });

  test("container destroy is called on app.stop()", async () => {
    const app = createApp();
    const destroySpy = mock(async () => {});
    app.container.destroy = destroySpy;

    await app.use({ name: "demo" });
    await app.start();
    await app.stop();

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
