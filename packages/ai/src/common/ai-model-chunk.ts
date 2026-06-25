// file: packages\ai\src\common\ai-model-chunk.ts

import type { IAiTokenUsage } from "./ai-token-usage.js";
import type { AiStopReason } from "./ai-stop-reason.js";

export interface IAiModelChunk<TDelta = unknown, TOutput = unknown> {
  id?: string;
  provider: string;
  model: string;
  delta?: TDelta;
  output?: TOutput;
  finishReason?: AiStopReason;
  usage?: IAiTokenUsage;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}
