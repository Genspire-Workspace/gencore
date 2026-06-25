// file: packages\ai\src\embeddings\embedding-generation-response.ts

import type { IAiModelResponse } from "../common/ai-model-response.js";

export interface IEmbeddingVector {
  index: number;
  embedding: number[];
}

export interface IEmbeddingGenerationResponse
  extends IAiModelResponse<IEmbeddingVector[]> {
  embeddings: IEmbeddingVector[];
}
