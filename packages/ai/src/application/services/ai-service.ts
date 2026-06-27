// file: packages/ai/src/application/services/ai-service.ts

import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../domain/chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../domain/chat/chat-generation-chunk.js";
import type { IEmbeddingGenerationRequest } from "../../domain/embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../domain/embeddings/embedding-generation-response.js";
import type { IAiDefaults } from "../../extension/ai-extension.js";
import { AiClientRegistry } from "../../providers/ai-provider-client-registry.js";
import { AiError } from "../../errors/ai-error.js";

export class AiService {
  constructor(
    private readonly registry: AiClientRegistry,
    private readonly defaults?: IAiDefaults,
  ) {}

  async generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const client = this.resolveChatClient(request.provider);
    if (!client.chat) {
      throw new AiError(
        `AI client '${client.id}' does not support chat generation.`,
      );
    }

    return client.chat.generateChatCompletion(
      this.applyChatDefaults(request),
    );
  }

  streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const client = this.resolveChatClient(request.provider);
    if (!client.chat) {
      throw new AiError(
        `AI client '${client.id}' does not support chat generation.`,
      );
    }

    return client.chat.streamChatCompletion(
      this.applyChatDefaults(request),
    );
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    const client = this.resolveEmbeddingClient(request.provider);
    if (!client.embeddings) {
      throw new AiError(
        `AI client '${client.id}' does not support embeddings.`,
      );
    }

    return client.embeddings.generateEmbedding(
      this.applyEmbeddingDefaults(request),
    );
  }

  private resolveChatClient(provider?: string) {
    const id = provider ?? this.defaults?.chatProvider;
    if (!id) {
      throw new AiError(
        "No chat provider specified. Provide a provider in the request or configure a default chatProvider.",
      );
    }
    return this.registry.get(id);
  }

  private resolveEmbeddingClient(provider?: string) {
    const id = provider ?? this.defaults?.embeddingProvider;
    if (!id) {
      throw new AiError(
        "No embedding provider specified. Provide a provider in the request or configure a default embeddingProvider.",
      );
    }
    return this.registry.get(id);
  }

  private applyChatDefaults(
    request: IChatGenerationRequest,
  ): IChatGenerationRequest {
    return {
      ...request,
      provider: request.provider ?? this.defaults?.chatProvider,
      model: request.model ?? this.defaults?.chatModel,
    };
  }

  private applyEmbeddingDefaults(
    request: IEmbeddingGenerationRequest,
  ): IEmbeddingGenerationRequest {
    return {
      ...request,
      provider: request.provider ?? this.defaults?.embeddingProvider,
      model: request.model ?? this.defaults?.embeddingModel,
    };
  }
}
