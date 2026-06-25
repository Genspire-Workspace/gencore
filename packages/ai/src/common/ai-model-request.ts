// file: packages\ai\src\common\ai-model-request.ts

export interface IAiModelRequest<TInput = unknown, TSettings = unknown> {
  provider?: string;
  model?: string;
  endpoint?: string;
  input?: TInput;
  settings?: TSettings;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}
