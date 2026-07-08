import type {
  AiContentPart,
  AiMessageContent,
} from "@genspire/ai/domain";
import type {
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineResponseDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IUpdateAiSessionRequestDto,
} from "@genspire/ai/server/contracts";

export type {
  AiContentPart,
  AiMessageContent,
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineResponseDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IUpdateAiSessionRequestDto,
};

export type IAiGenerateRequest = IAiChatGenerateRequestDto;
export type IAiGenerateResponse = IAiChatGenerateResponseDto;
export type IAiGenerateStreamChunk = IAiSseEventDto;
export type IAiEmbeddingRequest = IAiEmbeddingGenerateRequestDto;
export type IAiEmbeddingResponse = IAiEmbeddingGenerateResponseDto;

export interface IAiSessionAttachment {
  id: string;
  name: string;
  mediaType?: string;
  part: AiContentPart;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionViewMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: AiMessageContent;
  name?: string;
  pending?: boolean;
}

export interface IAiSessionClientState {
  sessionId: string;
  graph: IAiSessionGraphDto | null;
  activeTimelineId: string | null;
  messages: IAiSessionViewMessage[];
  prompt: string;
  attachments: IAiSessionAttachment[];
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
