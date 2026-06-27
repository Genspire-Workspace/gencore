// file: packages/ai/src/domain/embeddings/embedding-generation-response.ts

import type { IAiModelResponse } from "../generation/ai-model-response.js";

export interface IEmbeddingVector {
  index: number;
  embedding: number[];
}

export interface IEmbeddingGenerationResponse
  extends IAiModelResponse<IEmbeddingVector[]> {
  embeddings: IEmbeddingVector[];
}
