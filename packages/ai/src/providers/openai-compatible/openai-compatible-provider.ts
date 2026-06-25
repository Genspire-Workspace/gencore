// file: packages\ai\src\providers\openai-compatible\openai-compatible-provider.ts

import type { IAiProvider } from "../ai-provider.js";
import { OpenAiCompatibleClient } from "./openai-compatible-client.js";
import type { IOpenAiCompatibleProviderOptions } from "./openai-compatible-types.js";

export function openAiCompatibleProvider(
  options: IOpenAiCompatibleProviderOptions,
): IAiProvider {
  const client = new OpenAiCompatibleClient(options);

  return {
    id: options.id,
    displayName: options.displayName,
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
