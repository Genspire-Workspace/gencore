// file: packages/ai/src/application/tools/ai-tool-resolver.test.ts

import { describe, expect, test } from "bun:test";
import { AiToolRegistry } from "./ai-tool-registry.js";
import { AiToolResolver } from "./ai-tool-resolver.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";

const createTool = (name: string, description = `Tool ${name}`): IAiTool => ({
  name,
  description,
});

describe("AiToolResolver", () => {
  test("resolves direct tools", () => {
    const resolver = new AiToolResolver();

    expect(
      resolver.resolve({
        tools: [createTool("get_capital")],
      }),
    ).toEqual([createTool("get_capital")]);
  });

  test("resolves tool names from registry", () => {
    const registry = new AiToolRegistry([createTool("get_capital")]);
    const resolver = new AiToolResolver();

    const tools = resolver.resolve({
      toolNames: ["get_capital"],
      registry,
    });

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("get_capital");
  });

  test("direct tools override registry tools with same name", () => {
    const registry = new AiToolRegistry([createTool("get_capital", "Registry")]);
    const resolver = new AiToolResolver();

    const tools = resolver.resolve({
      toolNames: ["get_capital"],
      tools: [createTool("get_capital", "Direct")],
      registry,
    });

    expect(tools).toHaveLength(1);
    expect(tools[0]?.description).toBe("Direct");
  });

  test("throws when named tool cannot be resolved", () => {
    const resolver = new AiToolResolver();

    expect(() =>
      resolver.resolve({
        toolNames: ["missing"],
        registry: new AiToolRegistry(),
      })).toThrow("AI tool 'missing' could not be resolved.");
  });

  test("returns empty array when nothing provided", () => {
    const resolver = new AiToolResolver();

    expect(resolver.resolve({})).toEqual([]);
  });
});
