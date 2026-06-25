// file: packages\ai\src\services\ai-service.ts

import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../chat/chat-generation-chunk.js";
import type { IEmbeddingGenerationRequest } from "../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../embeddings/embedding-generation-response.js";
import type { IAiDefaults } from "../extension/ai-extension.js";
import { AiProviderRegistry } from "../providers/ai-provider-registry.js";
import { AiError } from "../errors/ai-error.js";

export class AiService {
  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly defaults?: IAiDefaults,
  ) {}

  async generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const providerId = request.provider ?? this.defaults?.chatProvider;
    if (!providerId) {
      throw new AiError("No chat provider was provided and no default chat provider is configured.");
    }

    const provider = this.registry.get(providerId);
    if (!provider.supportsChat() || !provider.chat) {
      throw new AiError(`AI provider '${providerId}' does not support chat.`);
    }

    const model = request.model ?? this.defaults?.chatModel;
    if (!model) {
      throw new AiError("No chat model was provided and no default chat model is configured.");
    }

    return provider.chat.generateChatCompletion({
      ...request,
      provider: providerId,
      model,
    });
  }

  streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const providerId = request.provider ?? this.defaults?.chatProvider;
    if (!providerId) {
      throw new AiError("No chat provider was provided and no default chat provider is configured.");
    }

    const provider = this.registry.get(providerId);
    if (!provider.supportsChat() || !provider.chat) {
      throw new AiError(`AI provider '${providerId}' does not support chat.`);
    }

    const model = request.model ?? this.defaults?.chatModel;
    if (!model) {
      throw new AiError("No chat model was provided and no default chat model is configured.");
    }

    return provider.chat.streamChatCompletion({
      ...request,
      provider: providerId,
      model,
    });
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    const providerId = request.provider ?? this.defaults?.embeddingProvider;
    if (!providerId) {
      throw new AiError("No embedding provider was provided and no default embedding provider is configured.");
    }

    const provider = this.registry.get(providerId);
    if (!provider.supportsEmbeddings() || !provider.embeddings) {
      throw new AiError(`AI provider '${providerId}' does not support embeddings.`);
    }

    const model = request.model ?? this.defaults?.embeddingModel;
    if (!model) {
      throw new AiError("No embedding model was provided and no default embedding model is configured.");
    }

    return provider.embeddings.generateEmbedding({
      ...request,
      provider: providerId,
      model,
    });
  }
}
