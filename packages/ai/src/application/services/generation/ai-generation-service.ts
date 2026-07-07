// file: packages\ai\src\application\services\generation\service.ts

import type { IChatGenerationRequest } from "../../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../../domain/chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../../domain/chat/chat-generation-chunk.js";
import type { IEmbeddingGenerationRequest } from "../../../domain/embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../../domain/embeddings/embedding-generation-response.js";
import type { IAiSessionSseEvent } from "../../../domain/session/types/ai-session-types.js";
import type {
  IAiDefaults,
  IAiProviderResolver,
} from "../../../extension/ai-extension.js";
import { AiProviderClientRegistry } from "../../../providers/ai-provider-client-registry.js";
import { AiError } from "../../../errors/ai-error.js";

export class AiGenerationService {
  constructor(
    private readonly registry: AiProviderClientRegistry,
    private readonly defaults?: IAiDefaults,
    private readonly providerResolver?: IAiProviderResolver,
  ) {}

  async generateChat(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const resolvedRequest = this.normalizeChatRequest(request);
    const client = this.resolveChatClient(resolvedRequest.provider);
    if (!client.chat) {
      throw new AiError(
        `AI client '${client.id}' does not support chat generation.`,
      );
    }

    return client.chat.generateChat(
      resolvedRequest,
    );
  }

  streamChat(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const resolvedRequest = this.normalizeChatRequest(request);
    const client = this.resolveChatClient(resolvedRequest.provider);
    if (!client.chat) {
      throw new AiError(
        `AI client '${client.id}' does not support chat generation.`,
      );
    }

    return client.chat.streamChat(
      resolvedRequest,
    );
  }

  async *streamChatEvents(
    request: IChatGenerationRequest,
  ): AsyncIterable<IAiSessionSseEvent> {
    yield {
      type: "started",
      provider: request.provider,
      model: request.model,
    };

    let terminalChunk: IChatGenerationChunk | null = null;

    for await (const chunk of this.streamChat(request)) {
      terminalChunk = chunk;

      if (chunk.delta) {
        yield {
          type: "delta",
          id: chunk.id,
          provider: chunk.provider,
          model: chunk.model,
          delta: chunk.delta,
          metadata: chunk.metadata,
        };
      }

      if (chunk.reasoningDelta) {
        yield {
          type: "reasoning_delta",
          id: chunk.id,
          provider: chunk.provider,
          model: chunk.model,
          reasoningDelta: chunk.reasoningDelta,
          metadata: chunk.metadata,
        };
      }

      if (chunk.toolCall) {
        yield {
          type: "tool_call",
          id: chunk.id,
          provider: chunk.provider,
          model: chunk.model,
          toolCall: chunk.toolCall,
          metadata: chunk.metadata,
        };
      }

      if (chunk.toolResult) {
        yield {
          type: "tool_result",
          id: chunk.id,
          provider: chunk.provider,
          model: chunk.model,
          toolResult: chunk.toolResult,
          metadata: chunk.metadata,
        };
      }

      if (chunk.message) {
        yield {
          type: "message",
          id: chunk.id,
          provider: chunk.provider,
          model: chunk.model,
          message: chunk.message,
          finishReason: chunk.finishReason,
          usage: chunk.usage as Record<string, unknown> | undefined,
          metadata: chunk.metadata,
        };
      }
    }

    yield {
      type: "completed",
      provider: terminalChunk?.provider ?? request.provider,
      model: terminalChunk?.model ?? request.model,
      finishReason: terminalChunk?.finishReason,
      usage: terminalChunk?.usage as Record<string, unknown> | undefined,
      metadata: terminalChunk?.metadata,
    };
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    const resolvedRequest = this.normalizeEmbeddingRequest(request);
    const client = this.resolveEmbeddingClient(resolvedRequest.provider);
    if (!client.embeddings) {
      throw new AiError(
        `AI client '${client.id}' does not support embeddings.`,
      );
    }

    return client.embeddings.generateEmbedding(
      resolvedRequest,
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

  private normalizeChatRequest(
    request: IChatGenerationRequest,
  ): IChatGenerationRequest {
    const resolved = this.providerResolver?.resolve({
      provider: request.provider ?? this.defaults?.chatProvider,
      model: request.model ?? this.defaults?.chatModel,
      kind: "chat",
    });

    return {
      ...request,
      provider: resolved?.provider ?? request.provider ?? this.defaults?.chatProvider,
      model: resolved?.model ?? request.model ?? this.defaults?.chatModel,
    };
  }

  private normalizeEmbeddingRequest(
    request: IEmbeddingGenerationRequest,
  ): IEmbeddingGenerationRequest {
    const resolved = this.providerResolver?.resolve({
      provider: request.provider ?? this.defaults?.embeddingProvider,
      model: request.model ?? this.defaults?.embeddingModel,
      kind: "embedding",
    });

    return {
      ...request,
      provider: resolved?.provider ?? request.provider ?? this.defaults?.embeddingProvider,
      model: resolved?.model ?? request.model ?? this.defaults?.embeddingModel,
    };
  }
}
