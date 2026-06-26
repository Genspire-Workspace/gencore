// file: packages\ai\src\tools\define-ai-tool.test.ts

import { describe, expect, test } from "bun:test";
import { defineAiTool } from "./define-ai-tool.js";

describe("defineAiTool", () => {
  test("trims name", () => {
    const tool = defineAiTool({
      name: "  get_capital  ",
      description: "Gets capital",
    });

    expect(tool.name).toBe("get_capital");
  });

  test("trims description", () => {
    const tool = defineAiTool({
      name: "get_capital",
      description: "  Gets capital  ",
    });

    expect(tool.description).toBe("Gets capital");
  });

  test("throws when name is empty", () => {
    expect(() =>
      defineAiTool({
        name: "   ",
        description: "Gets capital",
      })).toThrow("AI tool name is required.");
  });

  test("throws when description is missing or blank", () => {
    expect(() =>
      defineAiTool({
        name: "get_capital",
      })).toThrow("AI tool 'get_capital' requires a description.");

    expect(() =>
      defineAiTool({
        name: "get_capital",
        description: "   ",
      })).toThrow("AI tool 'get_capital' requires a description.");
  });

  test("allows a tool without execute", () => {
    const tool = defineAiTool({
      name: "get_capital",
      description: "Gets capital",
    });

    expect(tool.execute).toBeUndefined();
  });
});
