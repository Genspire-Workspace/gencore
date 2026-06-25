// file: packages\ai\src\clients\anthropic-compatible\anthropic-compatible-provider.ts

import type { IAiClient } from "../ai-client.js";
import { AnthropicCompatibleClient } from "./anthropic-compatible-client.js";
import type { IAnthropicCompatibleProviderOptions } from "./anthropic-compatible-types.js";

export function anthropicCompatibleProvider(
  options: IAnthropicCompatibleProviderOptions,
): IAiClient {
  const client = new AnthropicCompatibleClient(options);

  return {
    id: options.id,
    name: options.displayName,
    kind: "anthropic",
    chat: {
      generateChatCompletion(request) {
        return client.generateChatCompletion(request);
      },
      streamChatCompletion(request) {
        return client.streamChatCompletion(request);
      },
    },
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return false;
    },
  };
}
