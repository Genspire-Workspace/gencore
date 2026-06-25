// file: packages\ai\src\clients\openai-compatible\openai-compatible-provider.ts

import type { IAiClient } from "../ai-client.js";
import { OpenAiCompatibleClient } from "./openai-compatible-client.js";
import type { IOpenAiCompatibleProviderOptions } from "./openai-compatible-types.js";

export function openAiCompatibleProvider(
  options: IOpenAiCompatibleProviderOptions,
): IAiClient {
  const client = new OpenAiCompatibleClient(options);

  return {
    id: options.id,
    name: options.displayName,
    kind: "openai-compatible",
    chat: {
      generateChatCompletion(request) {
        return client.generateChatCompletion(request);
      },
      streamChatCompletion(request) {
        return client.streamChatCompletion(request);
      },
    },
    embeddings: {
      generateEmbedding(request) {
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
