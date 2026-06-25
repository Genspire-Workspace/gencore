// file: packages\ai\src\common\ai-generation-settings.ts

export interface IAiGenerationSettings {
  stream?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}
