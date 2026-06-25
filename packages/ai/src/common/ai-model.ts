// file: packages\ai\src\common\ai-model.ts

export type AiModelModality =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "embedding";

export interface IAiModelModalities {
  input: AiModelModality[];
  output: AiModelModality[];
}

export interface IAiModelInterleaved {
  field: string;
}

export interface IAiModelLimit {
  context?: number;
  input?: number;
  output?: number;
}

export interface IAiModelCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

export interface IAiModelLink {
  label?: string;
  name?: string;
  url: string;
}

export interface IAiModelBenchmark {
  name: string;
  score: number;
  metric?: string;
  source?: string;
}

export interface IAiModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  interleaved?: IAiModelInterleaved;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities: IAiModelModalities;
  open_weights?: boolean;
  limit?: IAiModelLimit;
  cost?: IAiModelCost;
  weights?: IAiModelLink[];
  benchmarks?: IAiModelBenchmark[];
  metadata?: Record<string, unknown>;
}
