// file: packages\ai\src\services\ai-service.ts

import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../chat/chat-generation-chunk.js";
import type { IEmbeddingGenerationRequest } from "../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../embeddings/embedding-generation-response.js";
import type { IAiDefaults } from "../extension/ai-extension.js";
import { AiClientRegistry } from "../clients/ai-client-registry.js";
import { AiError } from "../errors/ai-error.js";

export class AiService {
  constructor(
    private readonly registry: AiClientRegistry,
    private readonly defaults?: IAiDefaults,
  ) {}

  async generateChatCompletion(
    _request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    throw new AiError("AI generation is not available yet. AI clients have not been implemented.");
  }

  streamChatCompletion(
    _request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    throw new AiError("AI generation is not available yet. AI clients have not been implemented.");
  }

  async generateEmbedding(
    _request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    throw new AiError("AI generation is not available yet. AI clients have not been implemented.");
  }
}
