// file: packages\data\src\seeding\seeder-runner.test.ts

import { describe, expect, test } from "bun:test";
import { LogStore, LoggerFactory } from "@genspire/core";
import { SeederRunner } from "./seeder-runner.js";

describe("SeederRunner", () => {
  test("runs seeders only once", async () => {
    const calls: string[] = [];
    const runner = new SeederRunner({
      loggerFactory: new LoggerFactory(new LogStore()),
      seeders: [
        {
          name: "one",
          run() {
            calls.push("one");
          },
        },
        {
          name: "two",
          run() {
            calls.push("two");
          },
        },
      ],
    });

    await runner.run();
    await runner.run();

    expect(calls).toEqual(["one", "two"]);
    expect(runner.hasExecuted()).toBe(true);
  });
});
