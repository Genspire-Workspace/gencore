// file: packages\ai\src\providers\ollama\ollama-provider.ts

import type { IAiRuntimeProvider } from "../runtime/ai-runtime-provider.js";
import { OpenAiCompatibleClient } from "../openai-compatible/openai-compatible-client.js";
import type { IOpenAiCompatibleProviderOptions } from "../openai-compatible/openai-compatible-types.js";
import type { IChatGenerationRequest } from "../../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../chat/chat-generation-chunk.js";
import type { IChatMessage } from "../../chat/chat-message.js";

const THINK_TOKEN = "<|think|>";

function manageThinkToken(messages: IChatMessage[], thinkingEnabled: boolean): IChatMessage[] {
  const systemIndex = messages.findIndex((m) => m.role === "system");

  if (thinkingEnabled) {
    if (systemIndex === -1) {
      return [{ role: "system", content: THINK_TOKEN }, ...messages];
    }

    const sysMsg = messages[systemIndex]!;
    const content = typeof sysMsg.content === "string" ? sysMsg.content : "";

    if (content.startsWith(THINK_TOKEN)) return messages;

    return messages.map((m, i) =>
      i === systemIndex ? { ...m, content: `${THINK_TOKEN}\n${content}` } : m,
    );
  }

  if (systemIndex === -1) return messages;

  const sysMsg = messages[systemIndex]!;
  if (typeof sysMsg.content !== "string") return messages;

  const cleaned = sysMsg.content.replace(THINK_TOKEN, "").trimStart();

  if (cleaned === "") {
    return messages.filter((_, i) => i !== systemIndex);
  }

  return messages.map((m, i) =>
    i === systemIndex ? { ...m, content: cleaned } : m,
  );
}

export interface IOllamaProviderOptions extends IOpenAiCompatibleProviderOptions {}

export function ollamaProvider(options: IOllamaProviderOptions): IAiRuntimeProvider {
  const client = new OpenAiCompatibleClient(options);

  return {
    id: options.id,
    displayName: options.displayName,

    chat: {
      async generateChatCompletion(request: IChatGenerationRequest): Promise<IChatGenerationResponse> {
        const thinkingEnabled = request.settings?.reasoningEffort !== undefined
          && request.settings.reasoningEffort !== "none";

        return client.generateChatCompletion({
          ...request,
          messages: manageThinkToken(request.messages, thinkingEnabled),
        });
      },

      async *streamChatCompletion(request: IChatGenerationRequest): AsyncIterable<IChatGenerationChunk> {
        const thinkingEnabled = request.settings?.reasoningEffort !== undefined
          && request.settings.reasoningEffort !== "none";

        yield* client.streamChatCompletion({
          ...request,
          messages: manageThinkToken(request.messages, thinkingEnabled),
        });
      },
    },

    embeddings: {
      async generateEmbedding(request) {
        return client.generateEmbedding(request);
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
