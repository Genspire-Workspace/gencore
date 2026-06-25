import { describe, expect, test } from "bun:test";
import {
  findAiTool,
  createToolCallFromUnknown,
  createToolResultFromUnknown,
} from "./ai-tool-utils.js";
import type { IAiTool } from "./ai-tool.js";

const sampleTools: IAiTool[] = [
  {
    name: "get_capital",
    description: "Gets capital",
    execute: async () => "Lisbon",
  },
  {
    name: "add_numbers",
    description: "Adds two numbers",
  },
];

describe("findAiTool", () => {
  test("finds tool by name", () => {
    const tool = findAiTool(sampleTools, "get_capital");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("get_capital");
  });

  test("returns undefined for unknown name", () => {
    const tool = findAiTool(sampleTools, "nonexistent");
    expect(tool).toBeUndefined();
  });

  test("returns undefined when tools are undefined", () => {
    const tool = findAiTool(undefined, "any");
    expect(tool).toBeUndefined();
  });
});

describe("createToolCallFromUnknown", () => {
  test("supports toolCallId/toolName/input shape", () => {
    const call = createToolCallFromUnknown({
      toolCallId: "call-1",
      toolName: "get_capital",
      input: { country: "Portugal" },
    });
    expect(call).toBeDefined();
    expect(call!.id).toBe("call-1");
    expect(call!.name).toBe("get_capital");
    expect((call!.arguments as any).country).toBe("Portugal");
  });

  test("supports id/name/arguments shape", () => {
    const call = createToolCallFromUnknown({
      id: "abc",
      name: "add_numbers",
      arguments: { a: 1, b: 2 },
    });
    expect(call).toBeDefined();
    expect(call!.id).toBe("abc");
    expect(call!.name).toBe("add_numbers");
  });

  test("returns undefined without a name", () => {
    const call = createToolCallFromUnknown({ toolCallId: "x" });
    expect(call).toBeUndefined();
  });

  test("generates id when missing", () => {
    const call = createToolCallFromUnknown({
      toolName: "test",
      input: {},
    });
    expect(call).toBeDefined();
    expect(call!.id).toBeDefined();
    expect(typeof call!.id).toBe("string");
  });
});

describe("createToolResultFromUnknown", () => {
  test("supports toolCallId/toolName/output shape", () => {
    const result = createToolResultFromUnknown({
      toolCallId: "call-1",
      toolName: "get_capital",
      output: { capital: "Lisbon" },
    });
    expect(result).toBeDefined();
    expect(result!.toolCallId).toBe("call-1");
    expect(result!.name).toBe("get_capital");
    expect((result!.result as any).capital).toBe("Lisbon");
  });

  test("supports id/name/result shape", () => {
    const result = createToolResultFromUnknown({
      id: "abc",
      name: "add_numbers",
      result: { sum: 3 },
    });
    expect(result).toBeDefined();
    expect(result!.toolCallId).toBe("abc");
    expect(result!.name).toBe("add_numbers");
  });

  test("returns undefined without id or name", () => {
    const result = createToolResultFromUnknown({ output: {} });
    expect(result).toBeUndefined();
  });
});
