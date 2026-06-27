// file: packages/ai/src/domain/embeddings/embedding-generation-request.ts

import type { IAiModelRequest } from "../generation/ai-model-request.js";

export interface IEmbeddingGenerationRequest
  extends IAiModelRequest<string | string[]> {
  input: string | string[];
  dimensions?: number;
}
