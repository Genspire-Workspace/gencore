import { describe, expect, test } from "bun:test";
import type {
  IAiTokenUsage,
  IAiInputTokenUsageDetails,
  IAiOutputTokenUsageDetails,
  IChatGenerationChunk,
} from "../../index.js";

describe("IAiTokenUsage", () => {
  test("accepts flat shape (backward compat)", () => {
    const usage: IAiTokenUsage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    };
    expect(usage.inputTokens).toBe(10);
    expect(usage.outputTokens).toBe(20);
    expect(usage.totalTokens).toBe(30);
    expect(usage.inputTokenDetails).toBeUndefined();
  });

  test("accepts input token details", () => {
    const details: IAiInputTokenUsageDetails = {
      noCacheTokens: 40,
      cacheReadTokens: 5,
      cacheWriteTokens: 3,
    };
    const usage: IAiTokenUsage = {
      inputTokens: 48,
      outputTokens: 100,
      totalTokens: 148,
      inputTokenDetails: details,
    };
    expect(usage.inputTokenDetails?.noCacheTokens).toBe(40);
    expect(usage.inputTokenDetails?.cacheReadTokens).toBe(5);
    expect(usage.inputTokenDetails?.cacheWriteTokens).toBe(3);
  });

  test("accepts output token details", () => {
    const details: IAiOutputTokenUsageDetails = {
      textTokens: 80,
      reasoningTokens: 20,
    };
    const usage: IAiTokenUsage = {
      inputTokens: 50,
      outputTokens: 100,
      totalTokens: 150,
      outputTokenDetails: details,
    };
    expect(usage.outputTokenDetails?.textTokens).toBe(80);
    expect(usage.outputTokenDetails?.reasoningTokens).toBe(20);
  });

  test("accepts full usage with both details", () => {
    const usage: IAiTokenUsage = {
      inputTokens: 46,
      outputTokens: 156,
      totalTokens: 202,
      cacheReadTokens: 0,
      inputTokenDetails: {
        noCacheTokens: 46,
        cacheReadTokens: 0,
      },
      outputTokenDetails: {
        textTokens: 74,
        reasoningTokens: 82,
      },
    };
    expect(usage.inputTokens).toBe(46);
    expect(usage.outputTokens).toBe(156);
    expect(usage.totalTokens).toBe(202);
    expect(usage.cacheReadTokens).toBe(0);
    expect(usage.inputTokenDetails?.noCacheTokens).toBe(46);
    expect(usage.outputTokenDetails?.textTokens).toBe(74);
    expect(usage.outputTokenDetails?.reasoningTokens).toBe(82);
  });
});

describe("IChatGenerationChunk types", () => {
  test("text_delta chunk shape", () => {
    const chunk: IChatGenerationChunk = {
      id: "abc",
      type: "text_delta",
      provider: "test",
      model: "test-model",
      delta: "Hello",
    };
    expect(chunk.type).toBe("text_delta");
    expect(chunk.delta).toBe("Hello");
  });

  test("reasoning_delta chunk shape", () => {
    const chunk: IChatGenerationChunk = {
      id: "abc",
      type: "reasoning_delta",
      provider: "test",
      model: "test-model",
      reasoningDelta: "thinking...",
    };
    expect(chunk.type).toBe("reasoning_delta");
    expect(chunk.reasoningDelta).toBe("thinking...");
  });

  test("finish chunk shape", () => {
    const chunk: IChatGenerationChunk = {
      id: "abc",
      type: "finish",
      provider: "test",
      model: "test-model",
      finishReason: "stop",
      usage: {
        inputTokens: 46,
        outputTokens: 156,
        totalTokens: 202,
        inputTokenDetails: {
          noCacheTokens: 46,
          cacheReadTokens: 0,
        },
        outputTokenDetails: {
          textTokens: 74,
          reasoningTokens: 82,
        },
      },
    };
    expect(chunk.type).toBe("finish");
    expect(chunk.finishReason).toBe("stop");
    expect(chunk.usage?.inputTokenDetails?.noCacheTokens).toBe(46);
    expect(chunk.usage?.outputTokenDetails?.reasoningTokens).toBe(82);
  });

  test("chunk without type is still valid", () => {
    const chunk: IChatGenerationChunk = {
      id: "abc",
      provider: "test",
      model: "test-model",
      delta: "text",
    };
    expect(chunk.type).toBeUndefined();
    expect(chunk.delta).toBe("text");
  });
});
