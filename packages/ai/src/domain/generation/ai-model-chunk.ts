// file: packages/ai/src/domain/generation/ai-model-chunk.ts

import type { IAiTokenUsage } from "../models/ai-token-usage.js";
import type { AiStopReason } from "./ai-stop-reason.js";

export type AiModelChunkType =
  | "text_delta"
  | "reasoning_delta"
  | "tool_call_delta"
  | "tool_result_delta"
  | "message"
  | "finish"
  | "error";

export interface IAiModelChunk<TDelta = unknown, TOutput = unknown> {
  id?: string;
  type?: AiModelChunkType;
  provider: string;
  model: string;
  delta?: TDelta;
  output?: TOutput;
  finishReason?: AiStopReason;
  usage?: IAiTokenUsage;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}
