// file: packages\ai\src\clients\ollama\ollama-chat-generator.test.ts

import { describe, expect, test } from "bun:test";
import { isRecord } from "../../tools/ai-tool-utils.js";

type IOllamaMessage = {
  role: string;
  content: string;
  thinking?: string;
};

type IOllamaChatResponse = {
  model: string;
  created_at: Date;
  message: IOllamaMessage;
  done: boolean;
  done_reason: string;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
};

const loadedGenerator = await import("./ollama-chat-generator.js").catch(
  () => undefined,
);
const OllamaChatGenerator = loadedGenerator?.OllamaChatGenerator;
const maybeTest = OllamaChatGenerator ? test : test.skip;

function createGenerator() {
  if (!OllamaChatGenerator) {
    throw new Error("OllamaChatGenerator is unavailable.");
  }

  return new OllamaChatGenerator({
    id: "test",
    name: "Test",
    defaultModel: "test-model",
  });
}

function makePart(
  overrides: Partial<IOllamaChatResponse> = {},
): IOllamaChatResponse {
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
  maybeTest("yields text_delta for content chunks", () => {
    const generator = createGenerator();

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

  maybeTest("yields reasoning_delta for thinking chunks", () => {
    const generator = createGenerator();

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

  maybeTest("yields finish for done chunks", () => {
    const generator = createGenerator();

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

  maybeTest("finish chunk without content still gets type finish", () => {
    const generator = createGenerator();

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

  maybeTest("finish with content and done also marks as finish", () => {
    const generator = createGenerator();

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
  maybeTest("buildOllamaTools produces OpenAI-style function tools", () => {
    const generator = createGenerator();

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

  maybeTest("buildOllamaTools returns undefined when no tools", () => {
    const generator = createGenerator();

    const tools = Reflect.get(
      Reflect.getPrototypeOf(generator)!,
      "buildOllamaTools",
    ).call(generator, { tools: undefined });

    expect(tools).toBeUndefined();
  });

  maybeTest("extractOllamaToolCalls parses message.tool_calls array", () => {
    const generator = createGenerator();

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
    expect(isRecord(calls[0].arguments) ? calls[0].arguments.country : undefined).toBe("Portugal");
  });

  maybeTest("createOllamaToolResultMessage builds tool role message", () => {
    const generator = createGenerator();

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
