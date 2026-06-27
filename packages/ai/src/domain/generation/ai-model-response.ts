// file: packages/ai/src/domain/generation/ai-model-response.ts

import type { IAiTokenUsage } from "../models/ai-token-usage.js";
import type { AiStopReason } from "./ai-stop-reason.js";

export interface IAiModelResponse<TOutput = unknown> {
  id?: string;
  provider: string;
  model: string;
  output?: TOutput;
  finishReason?: AiStopReason;
  usage?: IAiTokenUsage;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}
