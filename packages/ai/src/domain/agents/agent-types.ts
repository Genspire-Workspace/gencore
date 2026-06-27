// file: packages/ai/src/domain/agents/agent-types.ts

import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type { IChatGenerationChunk } from "../chat/chat-generation-chunk.js";
import type { IChatGenerationResponse } from "../chat/chat-generation-response.js";
import type { IChatGenerationSettings } from "../chat/chat-generation-settings.js";
import type { IChatMessage } from "../chat/chat-message.js";
import type { IAiToolCall } from "../tools/ai-tool-call.js";
import type { IAiTool } from "../tools/ai-tool.js";
import type { IAiToolResult } from "../tools/ai-tool-result.js";

/**
 * Per-turn request overrides merged into the request built from the agent
 * context. Messages and tools come from the context and cannot be overridden
 * here.
 */
export type IAiAgentRequestOverrides = Pick<
  IChatGenerationRequest,
  "provider" | "model" | "userId" | "signal" | "metadata"
> & {
  settings?: IChatGenerationSettings;
};

export interface IAiAgentStep {
  index: number;
  request: IChatGenerationRequest;
  response: IChatGenerationResponse;
  toolResults: IAiToolResult[];
  done: boolean;
}

export interface IAiAgentLoopState {
  stepCount: number;
  steps: IAiAgentStep[];
}

export type IAiAgentStopCondition = (state: IAiAgentLoopState) => boolean;
export type IAiAgentMaxStepsFinalMessagePrompt =
  | string
  | ((state: IAiAgentLoopState) => string | Promise<string>);
export type IAiAgentToolExecutionMode = "immediate" | "deferred";

export interface IAiAgentContextSnapshot {
  systemPrompt?: IChatMessage;
  chatMessages: IChatMessage[];
  tools: IAiTool[];
  metadata?: Record<string, unknown>;
}

export interface IAiAgentResumeState {
  context: IAiAgentContextSnapshot;
  stepCount: number;
  steps: IAiAgentStep[];
  toolResults: IAiToolResult[];
  pendingToolCalls: IAiToolCall[];
}

export interface IAiAgentLoopOptions {
  tools?: readonly IAiTool[];
  maxSteps?: number;
  maxStepsFinalMessagePrompt?: IAiAgentMaxStepsFinalMessagePrompt | false;
  toolExecutionMode?: IAiAgentToolExecutionMode;
  stopWhen?: IAiAgentStopCondition;
  signal?: AbortSignal;
  requestOverrides?: IAiAgentRequestOverrides;
  onPrepareTurn?: (
    state: IAiAgentLoopState,
  ) => IAiAgentRequestOverrides | void | Promise<IAiAgentRequestOverrides | void>;
  onStepStart?: (state: IAiAgentLoopState) => void | Promise<void>;
  onStepChunk?: (
    chunk: IChatGenerationChunk,
    state: IAiAgentLoopState,
  ) => void | Promise<void>;
  onStepEnd?: (
    step: IAiAgentStep,
    state: IAiAgentLoopState,
  ) => void | Promise<void>;
  onMaxStepsFinalMessageStart?: (
    request: IChatGenerationRequest,
    state: IAiAgentLoopState,
  ) => void | Promise<void>;
  onMaxStepsFinalMessageChunk?: (
    chunk: IChatGenerationChunk,
    state: IAiAgentLoopState,
  ) => void | Promise<void>;
  onMaxStepsFinalMessageEnd?: (
    message: IChatMessage | undefined,
    state: IAiAgentLoopState,
  ) => void | Promise<void>;
  onTurnEnd?: (result: IAiAgentLoopResult) => void | Promise<void>;
}

export type IAiAgentLoopStopReason =
  | "completed"
  | "stopWhen"
  | "maxSteps"
  | "returnDirect"
  | "waitingForToolResults";

export interface IAiAgentLoopResult {
  steps: IAiAgentStep[];
  stepCount: number;
  finalMessage?: IChatMessage;
  toolResults: IAiToolResult[];
  pendingToolCalls?: IAiToolCall[];
  resumeState?: IAiAgentResumeState;
  returnDirectResult?: unknown;
  stopped: IAiAgentLoopStopReason;
}
