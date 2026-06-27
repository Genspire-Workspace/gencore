// file: packages/ai/src/domain/tokenization/ai-tokenizer-options.ts

export interface IAiTokenizerResolveOptions {
  model?: string;
  providerSelection?: string;
}

export interface IAiTokenChunkOptions extends IAiTokenizerResolveOptions {
  maxTokens: number;
  overlapTokens?: number;
}