import type { ICurrentUser } from "@genspire/auth";
import type { EventBus } from "@genspire/core";
import type { IAiPrompt } from "../../domain/prompts/ai-prompt.js";
import type { IAiSessionPromptReference } from "../../domain/session/types/ai-session-types.js";

export const DEFAULT_SESSION_SYSTEM_PROMPT_NAME = "System Prompt";
export const DEFAULT_SESSION_TITLE_PROMPT_NAME = "Session Title Generator Prompt";

export const AI_PROMPT_RESOLVE_REQUESTED_EVENT = "ai.prompt.resolve.requested";
export const AI_SESSION_FIRST_TURN_CREATED_EVENT = "ai.session.first-turn.created";

export interface IAiPromptResolveRequestedEventPayload {
  currentUser: ICurrentUser | null;
  reference: IAiSessionPromptReference;
  prompt?: IAiPrompt | null;
}

export interface IAiSessionFirstTurnCreatedEventPayload {
  currentUser: ICurrentUser;
  sessionId: string;
  timelineId: string;
  turnId: string;
  messageId: string;
}

export async function requestAiPrompt(
  bus: EventBus,
  input: {
    currentUser: ICurrentUser | null;
    reference: IAiSessionPromptReference;
  },
): Promise<IAiPrompt | null> {
  const payload: IAiPromptResolveRequestedEventPayload = {
    currentUser: input.currentUser,
    reference: input.reference,
    prompt: null,
  };

  await bus.emit(AI_PROMPT_RESOLVE_REQUESTED_EVENT, payload);
  return payload.prompt ?? null;
}
