import type {
  AiContentPart,
  AiMessageContent,
} from "@genspire/ai/domain/messages";
import type {
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  IDeleteAiSessionResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
  IAiSessionBranchResponseDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionMessageFeedbackResponseDto,
  IAiSessionMessageResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineResponseDto,
  IEditAiUserAndRegenerateRequestDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IRegenerateAiAssistantRequestDto,
  IUpdateAiSessionRequestDto,
} from "@genspire/ai/server/contracts";

export type {
  AiContentPart,
  AiMessageContent,
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  IDeleteAiSessionResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
  IAiSessionBranchResponseDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionMessageFeedbackResponseDto,
  IAiSessionMessageResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineResponseDto,
  IEditAiUserAndRegenerateRequestDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IRegenerateAiAssistantRequestDto,
  IUpdateAiSessionRequestDto,
};

export type IAiGenerateRequest = IAiChatGenerateRequestDto;
export type IAiGenerateResponse = IAiChatGenerateResponseDto;
export type IAiGenerateStreamChunk = IAiSseEventDto;
export type IAiEmbeddingRequest = IAiEmbeddingGenerateRequestDto;
export type IAiEmbeddingResponse = IAiEmbeddingGenerateResponseDto;
export type IAiSessionMessageFeedbackValue = "good" | "bad";

export interface IAiSessionStreamEvent extends IAiSseEventDto {
  timeline?: IAiSessionTimelineResponseDto;
  branch?: IAiSessionBranchResponseDto;
}

export interface IAiSessionAttachment {
  id: string;
  name: string;
  mediaType?: string;
  part: AiContentPart;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionViewMessage {
  id: string;
  messageId: string;
  sessionId: string;
  timelineId: string;
  turnId: string;
  index: number;
  role: "system" | "user" | "assistant" | "tool";
  content: AiMessageContent;
  name?: string;
  pending?: boolean;
  feedback?: IAiSessionMessageFeedbackValue | null;
  actions?: IAiSessionViewMessageActions;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionViewMessageActions {
  copy?: boolean;
  edit?: boolean;
  feedback?: boolean;
  regenerate?: boolean;
  branch?: boolean;
}

export interface IAiSessionEditingDraft {
  messageId: string;
  turnId: string;
  sessionId: string;
  timelineId: string;
  originalContent: AiMessageContent;
}

export interface IAiSessionClientState {
  sessionId: string;
  graph: IAiSessionGraphDto | null;
  activeTimelineId: string | null;
  messages: IAiSessionViewMessage[];
  prompt: string;
  attachments: IAiSessionAttachment[];
  editingDraft: IAiSessionEditingDraft | null;
  provider: string;
  model: string;
  loading: boolean;
  sending: boolean;
  streamStatus: string;
  error: string;
  activeStreamController: AbortController | null;
}

export interface IAiSessionWorkspaceSnapshot {
  selectedSessionId: string | null;
  sessions: IAiSessionResponseDto[];
  sessionListLoading: boolean;
  sessionListError: string;
  sessionStatesById: Record<string, IAiSessionClientState>;
}

export interface IAiSessionWorkspaceOptions {
  defaultProvider?: string;
  defaultModel?: string;
  source?: string;
  activeSessionStore?: IAiSessionActiveSessionStore;
  abortRefreshAttempts?: number;
  abortRefreshDelayMs?: number;
}

export interface IAiSessionActiveSessionStore {
  getActiveSessionId(): string | null;
  setActiveSessionId(sessionId: string | null): void;
}
