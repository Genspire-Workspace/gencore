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
