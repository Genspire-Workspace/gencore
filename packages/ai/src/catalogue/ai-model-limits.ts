export interface IAiModelLimits {
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxImageInputCount?: number;
  maxAudioInputSeconds?: number;
  maxFileInputSizeBytes?: number;
  embeddingDimensions?: number[];
  defaultEmbeddingDimensions?: number;
}
