// file: packages\ai\src\tools\ai-tool-calling-manager.test.ts

import { describe, expect, test } from "bun:test";
import { AiToolCallingManager } from "./ai-tool-calling-manager.js";
import type { IAiTool } from "./ai-tool.js";
import type { IAiToolCall } from "./ai-tool-call.js";

describe("AiToolCallingManager", () => {
  test("executes multiple tool calls", async () => {
    const manager = new AiToolCallingManager();
    const toolCalls: IAiToolCall[] = [
      { id: "call-1", name: "one", arguments: {} },
      { id: "call-2", name: "two", arguments: {} },
    ];
    const tools: IAiTool[] = [
      {
        name: "one",
        description: "One",
        execute: async () => 1,
      },
      {
        name: "two",
        description: "Two",
        execute: async () => 2,
      },
    ];

    const result = await manager.run({
      toolCalls,
      tools,
    });

    expect(result.toolResults).toHaveLength(2);
    expect(result.toolResults[0]?.result).toBe(1);
    expect(result.toolResults[1]?.result).toBe(2);
  });

  test("returns all results", async () => {
    const manager = new AiToolCallingManager();

    const result = await manager.run({
      toolCalls: [{ id: "call-1", name: "one", arguments: {} }],
      tools: [
        {
          name: "one",
          description: "One",
          execute: async () => ({ ok: true }),
        },
      ],
    });

    expect(result).toEqual({
      toolResults: [
        {
          toolCallId: "call-1",
          name: "one",
          result: { ok: true },
          raw: undefined,
        },
      ],
    });
  });

  test("stops and returns returnDirectResult when a tool has returnDirect", async () => {
    const manager = new AiToolCallingManager();

    const result = await manager.run({
      toolCalls: [
        { id: "call-1", name: "one", arguments: {} },
        { id: "call-2", name: "two", arguments: {} },
      ],
      tools: [
        {
          name: "one",
          description: "One",
          returnDirect: true,
          execute: async () => "direct",
        },
        {
          name: "two",
          description: "Two",
          execute: async () => "later",
        },
      ],
    });

    expect(result.toolResults).toHaveLength(1);
    expect(result.returnDirectResult).toBe("direct");
  });

  test("passes provider/model/userId/metadata/signal context to executor/tool", async () => {
    const manager = new AiToolCallingManager();
    const signal = new AbortController().signal;
    let receivedContext: Record<string, unknown> | undefined;

    await manager.run({
      toolCalls: [{ id: "call-1", name: "one", arguments: {} }],
      tools: [
        {
          name: "one",
          description: "One",
          execute: async (_args, context) => {
            receivedContext = context as unknown as Record<string, unknown>;
            return "ok";
          },
        },
      ],
      provider: "ollama",
      model: "gemma4:12b",
      userId: "user-1",
      metadata: { traceId: "abc" },
      signal,
    });

    expect(receivedContext).toEqual({
      provider: "ollama",
      model: "gemma4:12b",
      userId: "user-1",
      metadata: { traceId: "abc" },
      signal,
      toolCallId: "call-1",
      toolName: "one",
    });
  });
});
