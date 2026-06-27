// file: apps/playground-app-ai/src/ai/mock-provider-client.ts

import type {
  IChatGenerationChunk,
  IChatGenerationRequest,
  IChatGenerationResponse,
} from "../../../../packages/ai/src/domain/chat/index.js";
import type {
  IEmbeddingGenerationRequest,
  IEmbeddingGenerationResponse,
} from "../../../../packages/ai/src/domain/embeddings/index.js";
import type { IAiProviderClient } from "../../../../packages/ai/src/providers/ai-provider-client.js";

const PROVIDER_ID = "mock";
const PROVIDER_NAME = "Mock Provider";
const DEFAULT_MODEL = "mock-model";

function lastUserText(request: IChatGenerationRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const message = request.messages[i]!;
    if (message.role !== "user") {
      continue;
    }

    if (typeof message.content === "string") {
      return message.content;
    }

    return message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  }

  return "";
}

export function createMockProviderClient(): IAiProviderClient {
  return {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    kind: "custom",
    chat: {
      async generateChat(request): Promise<IChatGenerationResponse> {
        const text = lastUserText(request);
        return {
          id: "mock-chat-response",
          provider: PROVIDER_ID,
          model: request.model ?? DEFAULT_MODEL,
          message: {
            role: "assistant",
            content: `Mock reply to: ${text}`,
          },
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
      async *streamChat(request): AsyncIterable<IChatGenerationChunk> {
        const text = lastUserText(request);
        const model = request.model ?? DEFAULT_MODEL;

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          delta: "Mock ",
        };

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          delta: `reply to: ${text}`,
        };

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
    },
    embeddings: {
      async generateEmbedding(
        request: IEmbeddingGenerationRequest,
      ): Promise<IEmbeddingGenerationResponse> {
        const input =
          typeof request.input === "string"
            ? request.input
            : request.input.join(" ");
        const dimensions = 8;
        const embedding = Array.from({ length: dimensions }, (_, i) =>
          (input.charCodeAt(i % Math.max(input.length, 1)) % 100) / 100,
        );

        return {
          provider: PROVIDER_ID,
          model: request.model ?? DEFAULT_MODEL,
          embeddings: [{ index: 0, embedding }],
          usage: { inputTokens: 1, totalTokens: 1 },
        };
      },
    },
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return true;
    },
  };
}