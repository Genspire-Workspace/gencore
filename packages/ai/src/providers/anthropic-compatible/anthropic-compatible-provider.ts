// file: packages\ai\src\providers\anthropic-compatible\anthropic-compatible-provider.ts

import type { IAiRuntimeProvider } from "../runtime/ai-runtime-provider.js";
import { AnthropicCompatibleClient } from "./anthropic-compatible-client.js";
import type { IAnthropicCompatibleProviderOptions } from "./anthropic-compatible-types.js";

export function anthropicCompatibleProvider(
  options: IAnthropicCompatibleProviderOptions,
): IAiRuntimeProvider {
  const client = new AnthropicCompatibleClient(options);

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
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return false;
    },
  };
}
