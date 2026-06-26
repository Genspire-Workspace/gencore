// file: packages\ai\src\tools\ai-tool-executor.test.ts

import { describe, expect, test } from "bun:test";
import { AiToolExecutor } from "./ai-tool-executor.js";
import type { IAiTool } from "./ai-tool.js";
import type { IAiToolCall } from "./ai-tool-call.js";

const sampleCall: IAiToolCall = {
  id: "call-1",
  name: "get_capital",
  arguments: { country: "Portugal" },
  raw: { id: "call-1" },
};

describe("AiToolExecutor", () => {
  test("executes matching tool", async () => {
    const executor = new AiToolExecutor();
    const tools: IAiTool[] = [
      {
        name: "get_capital",
        description: "Gets capital",
        execute: async () => ({ capital: "Lisbon" }),
      },
    ];

    const result = await executor.execute(sampleCall, tools);

    expect(result.result).toEqual({ capital: "Lisbon" });
    expect(result.error).toBeUndefined();
  });

  test("passes execution context", async () => {
    const executor = new AiToolExecutor();
    let receivedContext: Record<string, unknown> | undefined;
    const tools: IAiTool[] = [
      {
        name: "get_capital",
        description: "Gets capital",
        execute: async (_args, context) => {
          receivedContext = context as unknown as Record<string, unknown>;
          return { capital: "Lisbon" };
        },
      },
    ];

    await executor.execute(sampleCall, tools, {
      provider: "ollama",
      model: "gemma4:12b",
      userId: "user-1",
      metadata: { traceId: "123" },
    });

    expect(receivedContext).toEqual({
      provider: "ollama",
      model: "gemma4:12b",
      userId: "user-1",
      metadata: { traceId: "123" },
      toolCallId: "call-1",
      toolName: "get_capital",
    });
  });

  test("returns error result when tool missing", async () => {
    const executor = new AiToolExecutor();

    const result = await executor.execute(sampleCall, []);

    expect(result.error).toBe("Tool 'get_capital' was not found.");
  });

  test("returns error result when tool is not executable", async () => {
    const executor = new AiToolExecutor();

    const result = await executor.execute(sampleCall, [
      {
        name: "get_capital",
        description: "Gets capital",
      },
    ]);

    expect(result.error).toBe("Tool 'get_capital' is not executable.");
  });

  test("catches thrown execution errors", async () => {
    const executor = new AiToolExecutor();

    const result = await executor.execute(sampleCall, [
      {
        name: "get_capital",
        description: "Gets capital",
        execute: async () => {
          throw new Error("boom");
        },
      },
    ]);

    expect(result.error).toBe("boom");
  });

  test("applies resultConverter", async () => {
    const executor = new AiToolExecutor();

    const result = await executor.execute(sampleCall, [
      {
        name: "get_capital",
        description: "Gets capital",
        resultConverter: (value) =>
          typeof value === "object" && value
            ? JSON.stringify(value)
            : value,
        execute: async () => ({ capital: "Lisbon" }),
      },
    ]);

    expect(result.result).toBe("{\"capital\":\"Lisbon\"}");
  });
});
