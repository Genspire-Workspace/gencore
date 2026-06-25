// file: packages\ai\src\services\ai-service.test.ts

import { describe, expect, test, beforeEach } from "bun:test";
import { AiService } from "./ai-service.js";
import { AiProviderRegistry } from "../providers/ai-provider-registry.js";
import type { IAiProvider } from "../providers/ai-provider.js";
import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../chat/chat-generation-response.js";
import type { IEmbeddingGenerationRequest } from "../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../embeddings/embedding-generation-response.js";
import type { IAiDefaults } from "../extension/ai-extension.js";

function createChatProvider(
  id: string,
  chatImpl?: {
    generate: (req: IChatGenerationRequest) => Promise<IChatGenerationResponse>;
  },
): IAiProvider {
  return {
    id,
    displayName: `Mock ${id}`,
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return false;
    },
    chat: {
      async generateChatCompletion(req) {
        return chatImpl?.generate(req) ?? {
          id: "resp-1",
          provider: id,
          model: req.model ?? "default",
          message: { role: "assistant", content: "ok" },
        };
      },
      streamChatCompletion() {
        throw new Error("not implemented");
      },
    },
  };
}

function createEmbeddingProvider(
  id: string,
  embeddingImpl?: {
    generate: (req: IEmbeddingGenerationRequest) => Promise<IEmbeddingGenerationResponse>;
  },
): IAiProvider {
  return {
    id,
    displayName: `Mock ${id}`,
    supportsChat() {
      return false;
    },
    supportsEmbeddings() {
      return true;
    },
    embeddings: {
      async generateEmbedding(req) {
        return embeddingImpl?.generate(req) ?? {
          provider: id,
          model: req.model ?? "default",
          embeddings: [{ index: 0, embedding: [0.1, 0.2] }],
        };
      },
    },
  };
}

describe("AiService", () => {
  let registry: AiProviderRegistry;
  let defaults: IAiDefaults;

  beforeEach(() => {
    registry = new AiProviderRegistry();
    defaults = {
      chatProvider: "openai",
      chatModel: "gpt-4",
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
    };
  });

  test("uses request provider/model when provided", async () => {
    const provider = createChatProvider("custom", {
      generate: async (req) => ({
        id: "resp-1",
        provider: "custom",
        model: req.model ?? "fallback",
        message: { role: "assistant", content: "from custom" },
      }),
    });
    registry.register(provider);

    const service = new AiService(registry, defaults);
    const response = await service.generateChatCompletion({
      provider: "custom",
      model: "custom-model",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("custom");
    expect(response.model).toBe("custom-model");
    expect(response.message.content).toBe("from custom");
  });

  test("falls back to default chat provider/model", async () => {
    const provider = createChatProvider("openai", {
      generate: async (req) => ({
        id: "resp-1",
        provider: "openai",
        model: req.model ?? "fallback",
        message: { role: "assistant", content: "default response" },
      }),
    });
    registry.register(provider);

    const service = new AiService(registry, defaults);
    const response = await service.generateChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("openai");
    expect(response.model).toBe("gpt-4");
  });

  test("falls back to default embedding provider/model", async () => {
    const provider = createEmbeddingProvider("openai", {
      generate: async (req) => ({
        provider: "openai",
        model: req.model ?? "fallback",
        embeddings: [{ index: 0, embedding: [1, 2, 3] }],
      }),
    });
    registry.register(provider);

    const service = new AiService(registry, defaults);
    const response = await service.generateEmbedding({
      input: "test",
    });

    expect(response.provider).toBe("openai");
    expect(response.model).toBe("text-embedding-3-small");
  });

  test("throws when no provider can be resolved", async () => {
    const service = new AiService(registry, {});
    await expect(
      service.generateChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("No chat provider was provided and no default chat provider is configured.");
  });

  test("throws when model cannot be resolved", async () => {
    const provider = createChatProvider("openai");
    registry.register(provider);

    const service = new AiService(registry, { chatProvider: "openai" });
    await expect(
      service.generateChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("No chat model was provided and no default chat model is configured.");
  });

  test("throws when provider does not support requested capability", async () => {
    const provider = createChatProvider("openai");
    registry.register(provider);

    const service = new AiService(registry, {
      embeddingProvider: "openai",
    });
    await expect(
      service.generateEmbedding({
        input: "test",
      }),
    ).rejects.toThrow("AI provider 'openai' does not support embeddings.");
  });
});
