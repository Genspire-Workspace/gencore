import { describe, expect, test } from "bun:test";
import { AiToolRegistry } from "./ai-tool-registry.js";
import type { IAiTool } from "./ai-tool.js";

const createTool = (name: string, description = `Tool ${name}`): IAiTool => ({
  name,
  description,
});

describe("AiToolRegistry", () => {
  test("constructor registers initial tools", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get("get_capital").name).toBe("get_capital");
  });

  test("register adds tool", () => {
    const registry = new AiToolRegistry();
    registry.register(createTool("get_capital"));

    expect(registry.has("get_capital")).toBe(true);
  });

  test("register rejects duplicate", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);

    expect(() => registry.register(createTool("get_capital"))).toThrow(
      "AI tool 'get_capital' is already registered.",
    );
  });

  test("upsert replaces", () => {
    const registry = new AiToolRegistry([createTool("get_capital", "Old")]);
    registry.upsert(createTool("get_capital", "New"));

    expect(registry.get("get_capital").description).toBe("New");
  });

  test("unregister removes", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);
    registry.unregister("get_capital");

    expect(registry.has("get_capital")).toBe(false);
  });

  test("get returns tool", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);

    expect(registry.get("get_capital").name).toBe("get_capital");
  });

  test("get throws when missing", () => {
    const registry = new AiToolRegistry();

    expect(() => registry.get("missing")).toThrow(
      "AI tool 'missing' is not registered.",
    );
  });

  test("tryGet returns undefined when missing", () => {
    const registry = new AiToolRegistry();

    expect(registry.tryGet("missing")).toBeUndefined();
  });

  test("has works", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);

    expect(registry.has("get_capital")).toBe(true);
    expect(registry.has("missing")).toBe(false);
  });

  test("list returns tools", () => {
    const registry = new AiToolRegistry([
      createTool("get_capital"),
      createTool("add_numbers"),
    ]);

    expect(registry.list().map((tool) => tool.name)).toEqual([
      "get_capital",
      "add_numbers",
    ]);
  });

  test("clear removes all", () => {
    const registry = new AiToolRegistry([
      createTool("get_capital"),
      createTool("add_numbers"),
    ]);
    registry.clear();

    expect(registry.list()).toEqual([]);
  });
});
