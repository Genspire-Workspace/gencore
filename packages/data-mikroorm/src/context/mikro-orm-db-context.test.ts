import { describe, expect, mock, test } from "bun:test";
import { Scoped } from "@genspire/core";
import { EntityManagerProvider } from "./entity-manager-provider.js";
import { MikroOrmDbContext } from "./mikro-orm-db-context.js";
import { MikroOrmDbSet } from "./mikro-orm-db-set.js";

class FakeEntity {
  id = "";
}

@Scoped()
class TestDbContext extends MikroOrmDbContext {
  readonly entities = this.set<FakeEntity, string>(FakeEntity);

  constructor(entityManagerProvider: EntityManagerProvider) {
    super(entityManagerProvider);
  }
}

describe("MikroOrmDbContext", () => {
  test("set() creates a DbSet", () => {
    const em = {
      fork: () => ({
        flush: mock(async () => {}),
        transactional: mock(async (callback: () => Promise<unknown>) => await callback()),
      }),
    };

    const context = new TestDbContext(em as unknown as EntityManagerProvider);

    expect(context.entities).toBeInstanceOf(MikroOrmDbSet);
  });

  test("saveChanges() calls flush", async () => {
    const flush = mock(async () => {});
    const context = new TestDbContext({
      fork: () => ({
        flush,
        transactional: mock(async (callback: () => Promise<unknown>) => await callback()),
      }),
    } as unknown as EntityManagerProvider);

    await context.saveChanges();

    expect(flush).toHaveBeenCalledTimes(1);
  });

  test("transaction() delegates to transactional", async () => {
    const transactional = mock(async (callback: () => Promise<string>) => await callback());
    const context = new TestDbContext({
      fork: () => ({
        flush: mock(async () => {}),
        transactional,
      }),
    } as unknown as EntityManagerProvider);

    const result = await context.transaction(async () => "ok");

    expect(result).toBe("ok");
    expect(transactional).toHaveBeenCalledTimes(1);
  });
});
