import type {
  AiContentPart,
  AiMessageContent,
} from "@genspire/ai/domain/messages";
import type {
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  IAiApiKeyListResponseDto,
  IAiApiKeyResponseDto,
  IAiModelListResponseDto,
  IAiModelResponseDto,
  IAiProviderClientKindListResponseDto,
  IAiProviderClientKindResponseDto,
  IAiProviderDiscoveryListResponseDto,
  IAiProviderListResponseDto,
  IAiProviderResponseDto,
  ICreateAiApiKeyRequestDto,
  ICreateAiModelRequestDto,
  ICreateAiProviderRequestDto,
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  ICreateAiSessionBranchRequestDto,
  ICreateAiSessionBranchResponseDto,
  IDeleteAiProviderResponseDto,
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
  IUpdateAiApiKeyRequestDto,
  IUpdateAiModelRequestDto,
  IUpdateAiProviderRequestDto,
  IUpdateAiSessionRequestDto,
} from "@genspire/ai/server/contracts";

export type {
  AiContentPart,
  AiMessageContent,
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  IAiApiKeyListResponseDto,
  IAiApiKeyResponseDto,
  IAiModelListResponseDto,
  IAiModelResponseDto,
  IAiProviderClientKindListResponseDto,
  IAiProviderClientKindResponseDto,
  IAiProviderDiscoveryListResponseDto,
  IAiProviderListResponseDto,
  IAiProviderResponseDto,
  ICreateAiApiKeyRequestDto,
  ICreateAiModelRequestDto,
  ICreateAiProviderRequestDto,
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  ICreateAiSessionBranchRequestDto,
  ICreateAiSessionBranchResponseDto,
  IDeleteAiProviderResponseDto,
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
  IUpdateAiApiKeyRequestDto,
  IUpdateAiModelRequestDto,
  IUpdateAiProviderRequestDto,
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
  session?: IAiSessionResponseDto;
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
  prompt: string;
  attachments: IAiSessionAttachment[];
}

export interface IAiSessionOptimisticStreamState {
  kind: "message" | "regenerate" | "edit";
  started: boolean;
  rollbackGraph: IAiSessionGraphDto | null;
  rollbackActiveTimelineId: string | null;
  optimisticTimelineId: string;
  optimisticTurnId: string;
  optimisticTimelineTurnId: string;
  optimisticUserMessageId: string;
  optimisticAssistantMessageId: string;
  optimisticBranchId?: string;
}

export interface IAiSessionClientState {
  sessionId: string;
  graph: IAiSessionGraphDto | null;
  persistedGraph: IAiSessionGraphDto | null;
  optimisticGraph: IAiSessionGraphDto | null;
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
  optimisticStream: IAiSessionOptimisticStreamState | null;
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
