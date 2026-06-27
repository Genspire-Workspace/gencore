// file: packages/ai/src/domain/tokenization/ai-token-chunk-result.ts

import type { IAiTokenChunk } from "./ai-token-chunk.js";

export interface IAiTokenChunkResult {
  encoding: string;
  tokenCount: number;
  chunkCount: number;
  chunks: IAiTokenChunk[];
}