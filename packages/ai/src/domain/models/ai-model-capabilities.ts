// file: packages/ai/src/domain/models/ai-model-capabilities.ts

export interface IAiModelCapabilities {
  chat?: boolean;
  streaming?: boolean;
  embeddings?: boolean;
  vision?: boolean;
  functionCalling?: boolean;
}
