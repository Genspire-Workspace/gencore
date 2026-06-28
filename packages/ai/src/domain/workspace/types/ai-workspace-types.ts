// file: packages/ai/src/domain/workspace/types/ai-workspace-types.ts

import type { IChatGenerationSettings } from "../../chat/chat-generation-settings.js";

export type AiSessionType = "chat";
export type AiSessionTurnStatus = "running" | "completed" | "failed";
export type AiGenerationRunStatus = "running" | "completed" | "failed";
export type AiSessionTimelineTurnSource =
  | "original"
  | "branch_copy"
  | "regenerated"
  | "edited_user";
export type AiSessionBranchReason =
  | "manual_branch"
  | "assistant_regeneration"
  | "user_edit_regeneration";
export type AiSessionMessageRole = "system" | "user" | "assistant" | "tool";
export type AiSessionFeedbackRating = "good" | "bad";

export interface IAiSessionSettings {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  generation?: IChatGenerationSettings;
  metadata?: Record<string, unknown>;
}

export interface IAiWorkspaceSseEvent {
  type:
    | "started"
    | "delta"
    | "reasoning_delta"
    | "tool_call"
    | "tool_result"
    | "heartbeat"
    | "message"
    | "completed"
    | "error";
  sessionId?: string;
  timelineId?: string;
  turnId?: string;
  timelineTurnId?: string;
  generationRunId?: string;
  messageId?: string;
  provider?: string;
  model?: string;
  id?: string;
  delta?: string;
  reasoningDelta?: string;
  finishReason?: string;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  message?: unknown;
  toolCall?: unknown;
  toolResult?: unknown;
  elapsedMs?: number;
  phase?: string;
  error?: string;
}
