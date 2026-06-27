// file: packages/ai/src/application/agents/agent-loop.test.ts

import { describe, expect, test } from "bun:test";
import { AiGenerationService } from "../services/ai-generation-service.js";
import { AiProviderClientRegistry } from "../../providers/ai-provider-client-registry.js";
import { AiContext } from "../context/ai-context.js";
import { defineAiTool } from "../../domain/tools/define-ai-tool.js";
import { Agent, AgentLoop, stepCountIs } from "./index.js";
import type { IAiProviderClient } from "../../providers/ai-provider-client.js";
import type { IChatGenerationChunk } from "../../domain/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../domain/chat/chat-generation-response.js";
import type { IAiToolResult } from "../../domain/tools/ai-tool-result.js";

const getCapital = defineAiTool({
  name: "get_capital",
  description: "Gets the capital city for a country.",
  execute: async () => ({ capital: "Lisbon" }),
});

function hasToolResult(request: IChatGenerationRequest): boolean {
  return request.messages.some(
    (message) =>
      Array.isArray(message.content) &&
      message.content.some((part) => part.type === "tool_result"),
  );
}

function createAgentTestProvider(): IAiProviderClient {
  return {
    id: "agent-test",
    name: "Agent Test",
    kind: "custom",
    chat: {
      async generateChat(request): Promise<IChatGenerationResponse> {
        const model = request.model ?? "agent-model";

        if (hasToolResult(request)) {
          return {
            id: "agent-final",
            provider: "agent-test",
            model,
            message: { role: "assistant", content: "Lisbon" },
            finishReason: "stop",
            usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
          };
        }

        return {
          id: "agent-tool-call",
          provider: "agent-test",
          model,
          message: {
            role: "assistant",
            content: "Let me check the capital.",
          },
          finishReason: "tool_use",
          toolCalls: [
            { id: "call-1", name: "get_capital", arguments: { country: "Portugal" } },
          ],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
      async *streamChat(request): AsyncIterable<IChatGenerationChunk> {
        const model = request.model ?? "agent-model";

        if (hasToolResult(request)) {
          yield {
            id: "agent-final-stream",
            provider: "agent-test",
            model,
            type: "text_delta",
            delta: "Lisbon",
          };
          yield {
            id: "agent-final-stream",
            provider: "agent-test",
            model,
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
          };
          return;
        }

        yield {
          id: "agent-stream",
          provider: "agent-test",
          model,
          type: "text_delta",
          delta: "Let me check the capital.",
        };
        yield {
          id: "agent-stream",
          provider: "agent-test",
          model,
          type: "tool_call_delta",
          toolCall: { id: "call-1", name: "get_capital", arguments: { country: "Portugal" } },
        };
        yield {
          id: "agent-stream",
          provider: "agent-test",
          model,
          type: "tool_result_delta",
          toolResult: { toolCallId: "call-1", name: "get_capital", result: { capital: "Lisbon" } },
        };
        yield {
          id: "agent-stream",
          provider: "agent-test",
          model,
          type: "finish",
          finishReason: "tool_use",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
    },
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return false;
    },
  };
}

function createAlwaysToolCallProvider(): IAiProviderClient {
  return {
    id: "always",
    name: "Always",
    kind: "custom",
    chat: {
      async generateChat(request): Promise<IChatGenerationResponse> {
        if (!request.tools?.length) {
          return {
            id: "always-final",
            provider: "always",
            model: request.model ?? "m",
            message: { role: "assistant", content: "Final answer after max steps." },
            finishReason: "stop",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        }

        return {
          id: "always",
          provider: "always",
          model: request.model ?? "m",
          message: { role: "assistant", content: "calling" },
          finishReason: "tool_use",
          toolCalls: [
            { id: "c", name: "get_capital", arguments: { country: "Portugal" } },
          ],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
      async *streamChat(request): AsyncIterable<IChatGenerationChunk> {
        if (!request.tools?.length) {
          yield {
            id: "always-final-stream",
            provider: "always",
            model: request.model ?? "m",
            type: "text_delta",
            delta: "Final answer after max steps.",
          };
          yield {
            id: "always-final-stream",
            provider: "always",
            model: request.model ?? "m",
            type: "finish",
            finishReason: "stop",
          };
          return;
        }

        yield {
          id: "always",
          provider: "always",
          model: request.model ?? "m",
          type: "text_delta",
          delta: "calling",
        };
        yield {
          id: "always",
          provider: "always",
          model: request.model ?? "m",
          type: "tool_call_delta",
          toolCall: { id: "c", name: "get_capital", arguments: { country: "Portugal" } },
        };
        yield {
          id: "always",
          provider: "always",
          model: request.model ?? "m",
          type: "tool_result_delta",
          toolResult: { toolCallId: "c", name: "get_capital", result: { capital: "Lisbon" } },
        };
        yield {
          id: "always",
          provider: "always",
          model: request.model ?? "m",
          type: "finish",
          finishReason: "tool_use",
        };
      },
    },
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return false;
    },
  };
}

function createAgent(providerId: string, provider: IAiProviderClient): Agent {
  const registry = new AiProviderClientRegistry();
  registry.register(provider);

  return new Agent(
    new AiGenerationService(registry, { chatProvider: providerId, chatModel: "agent-model" }),
    [getCapital],
  );
}

describe("Agent loop", () => {
  test("runs a tool-calling loop end-to-end with hooks", async () => {
    const agent = createAgent("agent-test", createAgentTestProvider());
    const context = AiContext.create().addUserMessage("What is the capital of Portugal?");

    const events: string[] = [];

    const result = await agent.run(context, {
      maxSteps: 5,
      onStepStart: (state) => events.push(`start:${state.stepCount}`),
      onStepEnd: (step) => events.push(`end:${step.index}:${step.done}`),
      onTurnEnd: (result) => events.push(`turn:${result.stepCount}:${result.stopped}`),
    });

    expect(result.stepCount).toBe(2);
    expect(result.stopped).toBe("completed");
    expect(result.finalMessage?.content).toBe("Lisbon");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0]?.result).toEqual({ capital: "Lisbon" });
    expect(events).toEqual(["start:0", "end:0:false", "start:1", "end:1:true", "turn:2:completed"]);
  });

  test("emits streamed step chunks through hooks", async () => {
    const agent = createAgent("agent-test", createAgentTestProvider());
    const context = AiContext.create().addUserMessage("What is the capital of Portugal?");
    const events: string[] = [];

    const result = await agent.run(context, {
      maxSteps: 5,
      onStepChunk: (chunk, state) => {
        events.push(`${state.stepCount}:${chunk.type ?? "unknown"}:${chunk.delta ?? ""}`);
      },
    });

    expect(result.stopped).toBe("completed");
    expect(events).toEqual([
      "0:text_delta:Let me check the capital.",
      "0:tool_call_delta:",
      "0:tool_result_delta:",
      "0:finish:",
      "1:text_delta:Lisbon",
      "1:finish:",
    ]);
  });

  test("adds agent-owned tools to the model request", async () => {
    let sawToolInRequest = false;

    const provider: IAiProviderClient = {
      id: "request-tools",
      name: "Request Tools",
      kind: "custom",
      chat: {
        async generateChat(request): Promise<IChatGenerationResponse> {
          sawToolInRequest = request.tools?.some((tool) => tool.name === "get_capital") ?? false;

          if (hasToolResult(request)) {
            return {
              id: "request-tools-final",
              provider: "request-tools",
              model: request.model ?? "agent-model",
              message: { role: "assistant", content: "Lisbon" },
              finishReason: "stop",
              usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
            };
          }

          return {
            id: "request-tools-call",
            provider: "request-tools",
            model: request.model ?? "agent-model",
            message: { role: "assistant", content: "Calling tool." },
            finishReason: "tool_use",
            toolCalls: [{ id: "call-1", name: "get_capital", arguments: { country: "Portugal" } }],
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        },
        async *streamChat(request): AsyncIterable<IChatGenerationChunk> {
          sawToolInRequest = request.tools?.some((tool) => tool.name === "get_capital") ?? false;

          const model = request.model ?? "agent-model";

          if (hasToolResult(request)) {
            yield {
              id: "request-tools-final-stream",
              provider: "request-tools",
              model,
              type: "text_delta",
              delta: "Lisbon",
            };
            yield {
              id: "request-tools-final-stream",
              provider: "request-tools",
              model,
              type: "finish",
              finishReason: "stop",
            };
            return;
          }

          yield {
            id: "request-tools-stream",
            provider: "request-tools",
            model,
            type: "text_delta",
            delta: "Calling tool.",
          };
          yield {
            id: "request-tools-stream",
            provider: "request-tools",
            model,
            type: "tool_call_delta",
            toolCall: { id: "call-1", name: "get_capital", arguments: { country: "Portugal" } },
          };
          yield {
            id: "request-tools-stream",
            provider: "request-tools",
            model,
            type: "tool_result_delta",
            toolResult: { toolCallId: "call-1", name: "get_capital", result: { capital: "Lisbon" } },
          };
          yield {
            id: "request-tools-stream",
            provider: "request-tools",
            model,
            type: "finish",
            finishReason: "tool_use",
          };
        },
      },
      supportsChat() {
        return true;
      },
      supportsEmbeddings() {
        return false;
      },
    };

    const agent = createAgent("request-tools", provider);
    const result = await agent.run(
      AiContext.create().addUserMessage("What is the capital of Portugal?"),
      { maxSteps: 5 },
    );

    expect(sawToolInRequest).toBe(true);
    expect(result.stopped).toBe("completed");
  });

  test("stops at maxSteps when the model keeps calling tools", async () => {
    const agent = createAgent("always", createAlwaysToolCallProvider());
    const context = AiContext.create().addUserMessage("loop");

    const result = await agent.run(context, { maxSteps: 3 });

    expect(result.stepCount).toBe(3);
    expect(result.stopped).toBe("maxSteps");
    expect(result.finalMessage?.content).toBe("Final answer after max steps.");
  });

  test("can defer tool execution and resume later with tool results", async () => {
    const agent = createAgent("agent-test", createAgentTestProvider());
    const initialContext = AiContext.create().addUserMessage(
      "What is the capital of Portugal?",
    );

    const waiting = await agent.run(initialContext, {
      toolExecutionMode: "deferred",
      maxSteps: 5,
    });

    expect(waiting.stopped).toBe("waitingForToolResults");
    expect(waiting.pendingToolCalls).toHaveLength(1);
    expect(waiting.resumeState).toBeDefined();
    expect(waiting.finalMessage).toBeUndefined();
    expect(waiting.toolResults).toHaveLength(0);

    const resumed = await agent.resume(
      waiting.resumeState!,
      [
        {
          toolCallId: "call-1",
          name: "get_capital",
          result: { capital: "Lisbon" },
        } satisfies IAiToolResult,
      ],
      {
        toolExecutionMode: "deferred",
        maxSteps: 5,
      },
    );

    expect(resumed.stopped).toBe("completed");
    expect(resumed.stepCount).toBe(2);
    expect(resumed.finalMessage?.content).toBe("Lisbon");
    expect(resumed.toolResults).toHaveLength(1);
    expect(resumed.toolResults[0]?.result).toEqual({ capital: "Lisbon" });
  });

  test("streams the final maxSteps message through hooks", async () => {
    const agent = createAgent("always", createAlwaysToolCallProvider());
    const context = AiContext.create().addUserMessage("loop");
    const events: string[] = [];

    const result = await agent.run(context, {
      maxSteps: 2,
      onMaxStepsFinalMessageStart: (request) => {
        events.push(`start:${request.tools?.length ?? 0}`);
      },
      onMaxStepsFinalMessageChunk: (chunk) => {
        events.push(`chunk:${chunk.type ?? "unknown"}:${chunk.delta ?? ""}`);
      },
      onMaxStepsFinalMessageEnd: (message) => {
        events.push(`end:${typeof message?.content === "string" ? message.content : ""}`);
      },
    });

    expect(result.stopped).toBe("maxSteps");
    expect(result.finalMessage?.content).toBe("Final answer after max steps.");
    expect(events).toEqual([
      "start:0",
      "chunk:text_delta:Final answer after max steps.",
      "chunk:finish:",
      "end:Final answer after max steps.",
    ]);
  });

  test("can opt out of final-message generation on maxSteps", async () => {
    const agent = createAgent("always", createAlwaysToolCallProvider());
    const context = AiContext.create().addUserMessage("loop");

    const result = await agent.run(context, {
      maxSteps: 3,
      maxStepsFinalMessagePrompt: false,
    });

    expect(result.stepCount).toBe(3);
    expect(result.stopped).toBe("maxSteps");
    expect(result.finalMessage).toBeUndefined();
  });

  test("respects a custom stopWhen condition", async () => {
    const agent = createAgent("always", createAlwaysToolCallProvider());
    const context = AiContext.create().addUserMessage("loop");

    const result = await agent.run(context, { stopWhen: stepCountIs(2) });

    expect(result.stepCount).toBe(2);
    expect(result.stopped).toBe("stopWhen");
  });

  test("subclassing AgentLoop to customize onPrepareTurn", async () => {
    const registry = new AiProviderClientRegistry();
    registry.register(createAlwaysToolCallProvider());

    class CountingLoop extends AgentLoop {
      prepareCalls = 0;

      protected onPrepareTurn() {
        this.prepareCalls += 1;
        return { metadata: { turn: this.prepareCalls } };
      }

      protected maxSteps() {
        return 1;
      }
    }

    const loop = new CountingLoop(
      new AiGenerationService(registry, { chatProvider: "always", chatModel: "agent-model" }),
      [getCapital],
    );

    const result = await loop.run(AiContext.create().addUserMessage("loop"));

    expect(result.stepCount).toBe(1);
    expect(result.stopped).toBe("maxSteps");
    expect(loop.prepareCalls).toBe(1);
  });
});
