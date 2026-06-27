// file: packages/ai/src/domain/embeddings/embedding-generator.ts

import type { IEmbeddingGenerationRequest } from "./embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "./embedding-generation-response.js";

export interface IEmbeddingGenerator {
  generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse>;
}
