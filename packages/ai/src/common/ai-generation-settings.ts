// file: packages\ai\src\common\ai-generation-settings.ts

export type AiReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface IAiGenerationSettings {
  stream?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  reasoningEffort?: AiReasoningEffort;
}
