// file: packages\ai\src\common\ai-token-usage.ts

export interface IAiInputTokenUsageDetails {
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  noCacheTokens?: number;
  [key: string]: number | undefined;
}

export interface IAiOutputTokenUsageDetails {
  textTokens?: number;
  reasoningTokens?: number;
  [key: string]: number | undefined;
}

export interface IAiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens?: number;

  inputTokenDetails?: IAiInputTokenUsageDetails;
  outputTokenDetails?: IAiOutputTokenUsageDetails;
}
