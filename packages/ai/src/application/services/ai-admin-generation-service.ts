// file: packages/ai/src/application/services/ai-admin-generation-service.ts

import { Scoped } from "@genspire/core";
import type { IChatGenerationChunk } from "../../domain/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../domain/chat/chat-generation-response.js";
import type { IEmbeddingGenerationRequest } from "../../domain/embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../domain/embeddings/embedding-generation-response.js";
import type { IAiWorkspaceSseEvent } from "../../domain/workspace/types/ai-workspace-types.js";
import { AiGenerationService } from "./ai-generation-service.js";

@Scoped()
export class AiAdminGenerationService {
  static inject = [AiGenerationService];

  constructor(private readonly generationService: AiGenerationService) {}

  async generateChat(request: IChatGenerationRequest): Promise<IChatGenerationResponse> {
    return await this.generationService.generateChat(request);
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    return await this.generationService.generateEmbedding(request);
  }

  async *streamChat(
    request: IChatGenerationRequest,
  ): AsyncIterable<IAiWorkspaceSseEvent> {
    yield {
      type: "started",
      provider: request.provider,
      model: request.model,
    };

    let terminalChunk: IChatGenerationChunk | null = null;

    for await (const chunk of this.generationService.streamChat(request)) {
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
}
