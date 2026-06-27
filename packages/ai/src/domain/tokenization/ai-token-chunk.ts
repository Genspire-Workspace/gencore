// file: packages/ai/src/domain/tokenization/ai-token-chunk.ts

export interface IAiTokenChunk {
  index: number;
  text: string;
  tokenCount: number;
  startToken: number;
  endToken: number;
}