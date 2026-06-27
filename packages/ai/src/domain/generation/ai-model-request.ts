// file: packages/ai/src/domain/generation/ai-model-request.ts

export interface IAiModelRequest<TInput = unknown, TSettings = unknown> {
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyId?: string;
  userId?: string;
  input?: TInput;
  settings?: TSettings;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}
