// file: packages\core\src\container\container.test.ts

import { describe, expect, test } from "bun:test";
import { Container } from "./container.js";
import { Scoped, Singleton, Transient } from "./decorators.js";
import type { IOnDestroy, IOnInit } from "../lifecycle/lifecycle.js";

describe("Container and ScopedContainer", () => {
  test("singleton returns same instance", () => {
    @Singleton()
    class Example {}

    const container = new Container();

    const first = container.resolve(Example);
    const second = container.resolve(Example);

    expect(first).toBe(second);
  });

  test("transient returns new instances", () => {
    @Transient()
    class Example {}

    const container = new Container();

    const first = container.resolve(Example);
    const second = container.resolve(Example);

    expect(first).not.toBe(second);
  });

  test("scoped returns same instance within scope", () => {
    @Scoped()
    class Example {}

    const container = new Container();
    const scope = container.createScope();

    const first = scope.resolve(Example);
    const second = scope.resolve(Example);

    expect(first).toBe(second);
  });

  test("scoped returns different instances across scopes", () => {
    @Scoped()
    class Example {}

    const container = new Container();
    const firstScope = container.createScope();
    const secondScope = container.createScope();

    const first = firstScope.resolve(Example);
    const second = secondScope.resolve(Example);

    expect(first).not.toBe(second);
  });

  test("OnInit and OnDestroy hooks run correctly", async () => {
    const calls: string[] = [];

    @Singleton()
    class SingletonHooked implements IOnInit, IOnDestroy {
      onInit(): void {
        calls.push("singleton:init");
      }

      onDestroy(): void {
        calls.push("singleton:destroy");
      }
    }

    @Scoped()
    class ScopedHooked implements IOnInit, IOnDestroy {
      onInit(): void {
        calls.push("scoped:init");
      }

      onDestroy(): void {
        calls.push("scoped:destroy");
      }
    }

    const container = new Container();
    const singleton = container.resolve(SingletonHooked);
    const scope = container.createScope();
    const scoped = scope.resolve(ScopedHooked);

    expect(singleton).toBeDefined();
    expect(scoped).toBeDefined();
    expect(calls).toEqual(["singleton:init", "scoped:init"]);

    await scope.destroy();
    await container.destroy();

    expect(calls).toEqual([
      "singleton:init",
      "scoped:init",
      "scoped:destroy",
      "singleton:destroy",
    ]);
  });
});
