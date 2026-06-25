// file: packages\ai\src\common\ai-token-usage.ts

export interface IAiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens?: number;
}
