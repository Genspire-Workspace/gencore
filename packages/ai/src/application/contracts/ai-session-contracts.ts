// file: packages/ai/src/application/contracts/ai-session-contracts.ts

import type { ICurrentUser } from "@genspire/auth";
import type { IChatGenerationSettings } from "../../domain/chat/chat-generation-settings.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import type {
  AiSessionBranchReason,
  AiSessionFeedbackRating,
  AiSessionTimelineTurnSource,
  AiSessionType,
  IAiSessionSettings,
} from "../../domain/session/types/ai-session-types.js";

export interface ICreateAiSessionInput {
  currentUser: ICurrentUser;
  title?: string | null;
  type?: AiSessionType;
  settings?: IAiSessionSettings;
  metadata?: Record<string, unknown> | null;
}

export interface IUpdateAiSessionInput {
  currentUser: ICurrentUser;
  sessionId: string;
  title?: string | null;
  type?: AiSessionType;
  settings?: IAiSessionSettings | null;
  metadata?: Record<string, unknown> | null;
}

export interface IGetAiSessionGraphInput {
  currentUser: ICurrentUser;
  sessionId: string;
  timelineId?: string;
}

export interface ICreateAiTimelineInput {
  currentUser: ICurrentUser;
  sessionId: string;
  name?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ICreateAiBranchInput {
  currentUser: ICurrentUser;
  sessionId: string;
  sourceTimelineId: string;
  sourceTurnId: string;
  name?: string | null;
  reason?: AiSessionBranchReason;
  metadata?: Record<string, unknown> | null;
}

export interface ICreateOrUpdateAiMessageFeedbackInput {
  currentUser: ICurrentUser;
  sessionId: string;
  messageId: string;
  rating: AiSessionFeedbackRating;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IGenerateAiSessionTurnInput {
  currentUser: ICurrentUser;
  sessionId: string;
  timelineId: string;
  content: unknown;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiTool[];
  settings?: IChatGenerationSettings & { stream?: boolean };
  metadata?: Record<string, unknown> | null;
  timelineTurnSource?: AiSessionTimelineTurnSource;
}

export interface IRegenerateAiAssistantMessageInput {
  currentUser: ICurrentUser;
  sessionId: string;
  timelineId: string;
  sourceTurnId: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiTool[];
  settings?: IChatGenerationSettings & { stream?: boolean };
  metadata?: Record<string, unknown> | null;
}

export interface IEditAiUserMessageAndRegenerateInput {
  currentUser: ICurrentUser;
  sessionId: string;
  timelineId: string;
  sourceTurnId: string;
  content: unknown;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiTool[];
  settings?: IChatGenerationSettings & { stream?: boolean };
  metadata?: Record<string, unknown> | null;
}
