// file: packages/ai/src/application/services/ai-tokenizer-service.test.ts

import { describe, expect, test } from "bun:test";
import { AiContext } from "../context/ai-context.js";
import { AiTokenizerService } from "./ai-tokenizer-service.js";

describe("AiTokenizerService", () => {
  const service = new AiTokenizerService();
  const sampleText = "The quick brown fox jumps over the lazy dog. ".repeat(20);

  test("counts tokens for a plain string using the default encoding", () => {
    const result = service.countTokens("hello world");

    expect(result.encoding).toBe("cl100k_base");
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  test("resolves a known model to a model-scoped encoding", () => {
    const result = service.countTokens("hello world", { model: "gpt-4" });

    expect(result.encoding).toBe("model:gpt-4");
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  test("falls back to the default encoding for unknown models", () => {
    const result = service.countTokens("hello world", {
      model: "some-unregistered-local-model",
    });

    expect(result.encoding).toBe("cl100k_base");
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  test("extracts a model from a provider selection string", () => {
    const result = service.countTokens("hello world", {
      providerSelection: "ollama:gemma4:12b",
    });

    expect(result.encoding).toBe("model:gemma4:12b");
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  test("counts tokens for an AiContext with a system prompt and messages", () => {
    const empty = service.countTokens(new AiContext());
    const context = AiContext.create()
      .setSystemPrompt("You are a helpful assistant.")
      .addUserMessage("Summarize this text.");

    const result = service.countTokens(context);

    expect(result.tokenCount).toBeGreaterThan(empty.tokenCount);
  });

  test("returns a single chunk when maxTokens covers the whole input", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const result = service.chunkText(sampleText, { maxTokens: total });

    expect(result.chunkCount).toBe(1);
    expect(result.tokenCount).toBe(total);
    expect(result.chunks[0].tokenCount).toBe(total);
  });

  test("splits text into bounded chunks", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const half = Math.max(1, Math.ceil(total / 2));
    const result = service.chunkText(sampleText, { maxTokens: half });

    expect(result.chunkCount).toBeGreaterThanOrEqual(2);
    for (const chunk of result.chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(half);
    }
    expect(result.tokenCount).toBe(total);
  });

  test("applies overlap between chunks", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const maxTokens = Math.max(2, Math.ceil(total / 4));
    const result = service.chunkText(sampleText, {
      maxTokens,
      overlapTokens: Math.max(1, Math.floor(maxTokens / 2)),
    });

    expect(result.chunkCount).toBeGreaterThanOrEqual(2);
    const overlapping = result.chunks.filter(
      (chunk, i) => i > 0 && chunk.startToken < result.chunks[i - 1].endToken,
    );
    expect(overlapping.length).toBeGreaterThan(0);
  });

  test("handles empty input", () => {
    expect(service.countTokens("").tokenCount).toBe(0);

    const chunked = service.chunkText("", { maxTokens: 8 });
    expect(chunked.chunkCount).toBe(0);
    expect(chunked.tokenCount).toBe(0);
    expect(chunked.chunks).toHaveLength(0);
  });

  test("chunkInput mirrors chunkText for AiContext input", () => {
    const context = AiContext.create().addUserMessage(sampleText);
    const direct = service.chunkText(sampleText, { maxTokens: 16 });
    const fromContext = service.chunkInput(context, { maxTokens: 16 });

    expect(fromContext.tokenCount).toBe(direct.tokenCount);
    expect(fromContext.chunkCount).toBe(direct.chunkCount);
  });
});