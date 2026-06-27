// file: apps\playground-ai\shared\verify-types.ts

import type { AiGenerationService } from "../../../packages/ai/src/application/services/ai-generation-service.js";

export type AiVerifySuite =
  | "generation"
  | "skill-generation"
  | "skill-api"
  | "ai-context"
  | "api"
  | "sessions";

export type AiVerifyScenarioId =
  | "ollama"
  | "deepseek";

export interface IAiVerifyCliArgs {
  list?: boolean;
  scenarios?: string;
  baseUrl?: string;
  model?: string;
}

export interface IAiVerifyScenarioFilter {
  explicit: boolean;
  values: ReadonlySet<string> | null;
}

export interface IAiVerifyScenario {
  id: AiVerifyScenarioId;
  name: string;
  service: AiGenerationService;
  chatModels: string[];
  embedModel?: string;
  supportsEmbedding: boolean;
}

export interface IAiVerifyRuntimeOptions {
  ollamaChatModel?: string;
}

export interface IAiVerifyLogOptions {
  suite: AiVerifySuite;
  filePrefix: string;
}

export interface IAiVerifyLogger {
  readonly logPath: string;
  log(message: string): void;
  close(): Promise<void>;
}
