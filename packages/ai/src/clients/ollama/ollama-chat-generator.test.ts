// file: packages\ai\src\clients\ollama\ollama-chat-generator.test.ts

import { describe, expect, test } from "bun:test";
import { OllamaChatGenerator } from "./ollama-chat-generator.js";
import type { ChatResponse, Message } from "ollama";

function makePart(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    model: "test-model",
    created_at: new Date(),
    message: { role: "assistant", content: "" },
    done: false,
    done_reason: "",
    total_duration: 0,
    load_duration: 0,
    prompt_eval_count: 0,
    prompt_eval_duration: 0,
    eval_count: 0,
    eval_duration: 0,
    ...overrides,
  };
}

describe("OllamaChatGenerator stream chunk types", () => {
  test("yields text_delta for content chunks", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const part = makePart({
      message: { role: "assistant", content: "Hello world" },
    });

    const chunk = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "toStreamChunk",
    ).call(generator, part, "test-model", "response-id");

    expect(chunk.type).toBe("text_delta");
    expect(chunk.delta).toBe("Hello world");
  });

  test("yields reasoning_delta for thinking chunks", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const part = makePart({
      message: { role: "assistant", content: "", thinking: "Let me think..." },
    });

    const chunk = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "toStreamChunk",
    ).call(generator, part, "test-model", "response-id");

    expect(chunk.type).toBe("reasoning_delta");
    expect(chunk.reasoningDelta).toBe("Let me think...");
  });

  test("yields finish for done chunks", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const part = makePart({
      done: true,
      done_reason: "stop",
      message: { role: "assistant", content: "" },
      prompt_eval_count: 64,
      eval_count: 675,
    });

    const chunk = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "toStreamChunk",
    ).call(generator, part, "test-model", "response-id");

    expect(chunk.type).toBe("finish");
    expect(chunk.finishReason).toBe("stop");
    expect(chunk.usage).toBeDefined();
    expect(chunk.usage!.inputTokens).toBe(64);
    expect(chunk.usage!.outputTokens).toBe(675);
    expect(chunk.usage!.totalTokens).toBe(739);
  });

  test("finish chunk without content still gets type finish", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const part = makePart({
      done: true,
      done_reason: "stop",
      message: { role: "assistant", content: "" },
      prompt_eval_count: 10,
      eval_count: 30,
    });

    const chunk = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "toStreamChunk",
    ).call(generator, part, "test-model", "response-id");

    expect(chunk.type).toBe("finish");
    expect(chunk.finishReason).toBe("stop");
  });

  test("finish with content and done also marks as finish", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const part = makePart({
      done: true,
      done_reason: "stop",
      message: { role: "assistant", content: "final text" },
      prompt_eval_count: 5,
      eval_count: 15,
    });

    const chunk = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "toStreamChunk",
    ).call(generator, part, "test-model", "response-id");

    expect(chunk.type).toBe("finish");
    expect(chunk.delta).toBe("final text");
  });
});

describe("OllamaChatGenerator tool mapping", () => {
  test("buildOllamaTools produces OpenAI-style function tools", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const tools = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "buildOllamaTools",
    ).call(generator, {
      tools: [
        {
          name: "get_capital",
          description: "Gets capital",
          parameters: {
            type: "object",
            properties: { country: { type: "string" } },
            required: ["country"],
          },
        },
      ],
    });

    expect(tools).toBeDefined();
    expect(tools).toHaveLength(1);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("get_capital");
    expect(tools[0].function.description).toBe("Gets capital");
    expect(tools[0].function.parameters.required).toContain("country");
  });

  test("buildOllamaTools returns undefined when no tools", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const tools = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "buildOllamaTools",
    ).call(generator, { tools: undefined });

    expect(tools).toBeUndefined();
  });

  test("extractOllamaToolCalls parses message.tool_calls array", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const calls = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "extractOllamaToolCalls",
    ).call(generator, {
      tool_calls: [
        {
          id: "call-1",
          function: {
            name: "get_capital",
            arguments: { country: "Portugal" },
          },
        },
      ],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("get_capital");
    expect((calls[0].arguments as any).country).toBe("Portugal");
  });

  test("createOllamaToolResultMessage builds tool role message", () => {
    const generator = new OllamaChatGenerator({
      id: "test",
      name: "Test",
      defaultModel: "test-model",
    });

    const msg = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "createOllamaToolResultMessage",
    ).call(generator, {
      toolCallId: "call-1",
      name: "get_capital",
      result: { capital: "Lisbon" },
    });

    expect(msg.role).toBe("tool");
    expect(msg.tool_call_id).toBe("call-1");
    const parsed = JSON.parse(msg.content);
    expect(parsed.capital).toBe("Lisbon");
  });
});
