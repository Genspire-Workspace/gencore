// file: packages/ai/src/application/services/ai-service.test.ts

import { describe, expect, test } from "bun:test";
import { AiClientRegistry } from "../../providers/ai-provider-client-registry.js";
import { AiService } from "./ai-service.js";
import type { IAiClient } from "../../providers/ai-provider-client.js";
import type { IAiTokenUsage } from "../../domain/models/ai-token-usage.js";

function createMockClient(
  id: string,
  name: string,
): IAiClient {
  let chatCalled = false;
  let streamCalled = false;
  let embeddingCalled = false;

  return {
    id,
    name,
    kind: "openai-compatible",
    chat: {
      async generateChatCompletion(request) {
        chatCalled = true;
        return {
          id: "mock-id",
          provider: id,
          model: request.model ?? "unknown",
          message: { role: "assistant", content: "mock response" },
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } as IAiTokenUsage,
        };
      },
      async *streamChatCompletion(_request) {
        streamCalled = true;
        yield {
          id: "mock-id",
          provider: id,
          model: _request.model ?? "unknown",
          delta: "mock",
        };
        yield {
          id: "mock-id",
          provider: id,
          model: _request.model ?? "unknown",
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } as IAiTokenUsage,
        };
      },
    },
    embeddings: {
      async generateEmbedding(request) {
        embeddingCalled = true;
        return {
          provider: id,
          model: request.model ?? "unknown",
          embeddings: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
        };
      },
    },
    supportsChat() { return true; },
    supportsEmbeddings() { return true; },
  };
}

describe("AiService", () => {
  test("throws when no chat provider is configured", async () => {
    const service = new AiService(new AiClientRegistry());

    await expect(
      service.generateChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow(
      "No chat provider specified. Provide a provider in the request or configure a default chatProvider.",
    );
  });

  test("throws when chat client is not registered", async () => {
    const service = new AiService(new AiClientRegistry(), {
      chatProvider: "nonexistent",
      chatModel: "gpt-4",
    });

    await expect(
      service.generateChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("AI client 'nonexistent' is not registered.");
  });

  test("throws when no embedding provider is configured", async () => {
    const service = new AiService(new AiClientRegistry());

    await expect(
      service.generateEmbedding({
        input: "test",
      }),
    ).rejects.toThrow(
      "No embedding provider specified. Provide a provider in the request or configure a default embeddingProvider.",
    );
  });

  test("throws when embedding client is not registered", async () => {
    const service = new AiService(new AiClientRegistry(), {
      embeddingProvider: "nonexistent",
      embeddingModel: "text-embedding-3-small",
    });

    await expect(
      service.generateEmbedding({
        input: "test",
      }),
    ).rejects.toThrow("AI client 'nonexistent' is not registered.");
  });

  test("delegates chat generation to registered client", async () => {
    const registry = new AiClientRegistry();
    const client = createMockClient("test-provider", "Test Provider");
    registry.register(client);

    const service = new AiService(registry, {
      chatProvider: "test-provider",
      chatModel: "test-model",
    });

    const response = await service.generateChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("test-provider");
    expect(response.model).toBe("test-model");
    expect(response.message.content).toBe("mock response");
  });

  test("delegates embedding generation to registered client", async () => {
    const registry = new AiClientRegistry();
    const client = createMockClient("test-provider", "Test Provider");
    registry.register(client);

    const service = new AiService(registry, {
      embeddingProvider: "test-provider",
      embeddingModel: "test-embed-model",
    });

    const response = await service.generateEmbedding({ input: "test" });

    expect(response.provider).toBe("test-provider");
    expect(response.model).toBe("test-embed-model");
    expect(response.embeddings).toHaveLength(1);
  });

  test("applies default model when request does not specify one", async () => {
    const registry = new AiClientRegistry();
    const client = createMockClient("test-provider", "Test Provider");
    registry.register(client);

    const service = new AiService(registry, {
      chatProvider: "test-provider",
      chatModel: "default-model",
    });

    const response = await service.generateChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.model).toBe("default-model");
  });

  test("prefers request provider over default", async () => {
    const registry = new AiClientRegistry();
    const clientA = createMockClient("provider-a", "Provider A");
    const clientB = createMockClient("provider-b", "Provider B");
    registry.register(clientA);
    registry.register(clientB);

    const service = new AiService(registry, {
      chatProvider: "provider-a",
      chatModel: "default-model",
    });

    const response = await service.generateChatCompletion({
      provider: "provider-b",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("provider-b");
  });

  test("streams chat completion from registered client", async () => {
    const registry = new AiClientRegistry();
    const client = createMockClient("test-provider", "Test Provider");
    registry.register(client);

    const service = new AiService(registry, {
      chatProvider: "test-provider",
      chatModel: "test-model",
    });

    const chunks: Array<{ delta?: string; finishReason?: string }> = [];
    for await (const chunk of service.streamChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.delta === "mock")).toBeTrue();
    expect(chunks.some((c) => c.finishReason === "stop")).toBeTrue();
  });
});
