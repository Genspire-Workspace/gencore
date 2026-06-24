// file: packages\data-mikroorm\src\context\mikro-orm-db-set.test.ts

import { describe, expect, mock, test } from "bun:test";
import { MikroOrmDbSet } from "./mikro-orm-db-set.js";

class FakeEntity {
  id = "";
}

describe("MikroOrmDbSet", () => {
  test("add() calls persist but not flush", async () => {
    const persist = mock(() => {});
    const flush = mock(async () => {});
    const set = new MikroOrmDbSet<FakeEntity, string>({
      persist,
      flush,
    } as never, FakeEntity);
    const entity = new FakeEntity();

    await set.add(entity);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(0);
  });

  test("remove() calls remove but not flush", async () => {
    const remove = mock(() => {});
    const flush = mock(async () => {});
    const set = new MikroOrmDbSet<FakeEntity, string>({
      remove,
      flush,
    } as never, FakeEntity);
    const entity = new FakeEntity();

    await set.remove(entity);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(0);
  });

  test("removeById() returns false if not found", async () => {
    const remove = mock(() => {});
    const set = new MikroOrmDbSet<FakeEntity, string>({
      findOne: mock(async () => null),
      remove,
    } as never, FakeEntity);

    const removed = await set.removeById("missing");

    expect(removed).toBe(false);
    expect(remove).toHaveBeenCalledTimes(0);
  });
});
