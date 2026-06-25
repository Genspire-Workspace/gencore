// file: packages\ai\src\embeddings\embedding-generation-request.ts

import type { IAiModelRequest } from "../common/ai-model-request.js";

export interface IEmbeddingGenerationRequest
  extends IAiModelRequest<string | string[]> {
  input: string | string[];
  dimensions?: number;
}
