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
const VERIFICATION_SECRET = "Gencore agent verification secret";

function hasTool(request: IChatGenerationRequest, name: string): boolean {
  return request.tools?.some((tool) => tool.name === name) ?? false;
}

function getToolResultContent(
  request: IChatGenerationRequest,
  toolCallId: string,
): string | undefined {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const message = request.messages[i]!;
    if (message.role !== "tool" || !Array.isArray(message.content)) {
      continue;
    }

    const part = message.content.find(
      (candidate) =>
        candidate.type === "tool_result" && candidate.toolCallId === toolCallId,
    );

    if (!part || part.type !== "tool_result") {
      continue;
    }

    if (typeof part.content === "string") {
      return part.content;
    }
  }

  return undefined;
}

function hasImageInput(request: IChatGenerationRequest): boolean {
  return request.messages.some(
    (message) =>
      Array.isArray(message.content) &&
      message.content.some((part) => part.type === "image"),
  );
}

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
        if (hasTool(request, "continue_agent_verification")) {
          return {
            id: "mock-agent-loop",
            provider: PROVIDER_ID,
            model: request.model ?? DEFAULT_MODEL,
            message: {
              role: "assistant",
              content: "Continuing verification loop.",
            },
            finishReason: "tool_use",
            toolCalls: [
              {
                id: "continue-call",
                name: "continue_agent_verification",
                arguments: {},
              },
            ],
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        }

        if (hasTool(request, "get_verification_secret")) {
          const toolResult = getToolResultContent(request, "secret-call");

          if (toolResult) {
            return {
              id: "mock-agent-secret-final",
              provider: PROVIDER_ID,
              model: request.model ?? DEFAULT_MODEL,
              message: {
                role: "assistant",
                content: VERIFICATION_SECRET,
              },
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            };
          }

          return {
            id: "mock-agent-secret-tool",
            provider: PROVIDER_ID,
            model: request.model ?? DEFAULT_MODEL,
            message: {
              role: "assistant",
              content: "Calling the verification tool.",
            },
            finishReason: "tool_use",
            toolCalls: [
              {
                id: "secret-call",
                name: "get_verification_secret",
                arguments: {},
              },
            ],
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        }

        if (hasImageInput(request)) {
          return {
            id: "mock-vision-response",
            provider: PROVIDER_ID,
            model: request.model ?? DEFAULT_MODEL,
            message: {
              role: "assistant",
              content: "red",
            },
            finishReason: "stop",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        }

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
        const model = request.model ?? DEFAULT_MODEL;

        if (hasTool(request, "continue_agent_verification")) {
          yield {
            id: "mock-agent-loop-stream",
            provider: PROVIDER_ID,
            model,
            type: "text_delta",
            delta: "Continuing verification loop.",
          };
          yield {
            id: "mock-agent-loop-stream",
            provider: PROVIDER_ID,
            model,
            type: "tool_call_delta",
            toolCall: {
              id: "continue-call",
              name: "continue_agent_verification",
              arguments: {},
            },
          };
          yield {
            id: "mock-agent-loop-stream",
            provider: PROVIDER_ID,
            model,
            type: "tool_result_delta",
            toolResult: {
              toolCallId: "continue-call",
              name: "continue_agent_verification",
              result: {
                instruction:
                  "Continue the loop verification. Do not answer the user yet. Call continue_agent_verification again.",
              },
            },
          };
          yield {
            id: "mock-agent-loop-stream",
            provider: PROVIDER_ID,
            model,
            type: "finish",
            finishReason: "tool_use",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
          return;
        }

        if (hasTool(request, "get_verification_secret")) {
          const toolResult = getToolResultContent(request, "secret-call");

          if (toolResult) {
            yield {
              id: "mock-agent-secret-final-stream",
              provider: PROVIDER_ID,
              model,
              type: "text_delta",
              delta: VERIFICATION_SECRET,
            };
            yield {
              id: "mock-agent-secret-final-stream",
              provider: PROVIDER_ID,
              model,
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            };
            return;
          }

          yield {
            id: "mock-agent-secret-tool-stream",
            provider: PROVIDER_ID,
            model,
            type: "text_delta",
            delta: "Calling the verification tool.",
          };
          yield {
            id: "mock-agent-secret-tool-stream",
            provider: PROVIDER_ID,
            model,
            type: "tool_call_delta",
            toolCall: {
              id: "secret-call",
              name: "get_verification_secret",
              arguments: {},
            },
          };
          yield {
            id: "mock-agent-secret-tool-stream",
            provider: PROVIDER_ID,
            model,
            type: "tool_result_delta",
            toolResult: {
              toolCallId: "secret-call",
              name: "get_verification_secret",
              result: { secret: VERIFICATION_SECRET },
            },
          };
          yield {
            id: "mock-agent-secret-tool-stream",
            provider: PROVIDER_ID,
            model,
            type: "finish",
            finishReason: "tool_use",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
          return;
        }

        if (hasImageInput(request)) {
          yield {
            id: "mock-vision-stream",
            provider: PROVIDER_ID,
            model,
            type: "text_delta",
            delta: "red",
          };
          yield {
            id: "mock-vision-stream",
            provider: PROVIDER_ID,
            model,
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
          return;
        }

        const text = lastUserText(request);

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          type: "text_delta",
          delta: "Mock ",
        };

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          type: "text_delta",
          delta: `reply to: ${text}`,
        };

        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          type: "finish",
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
