import type {
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  IAiSessionMessageFeedbackResponseDto,
  IAiSessionGraphDto,
  IAiSessionResponseDto,
  IAiSessionStreamEvent,
  ICreateAiSessionRequestDto,
  IEditAiUserAndRegenerateRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IRegenerateAiAssistantRequestDto,
  IUpdateAiSessionRequestDto,
} from "../../domain/types/ai-session-sdk-types.js";

export interface IAiSessionStreamOptions {
  signal?: AbortSignal;
}

export interface IAiSessionTransport {
  listSessions(): Promise<IAiSessionResponseDto[]>;
  createSession(input?: ICreateAiSessionRequestDto): Promise<IAiSessionResponseDto>;
  getSession(sessionId: string): Promise<IAiSessionResponseDto | null>;
  updateSession(
    sessionId: string,
    input: IUpdateAiSessionRequestDto,
  ): Promise<IAiSessionResponseDto>;
  getSessionGraph(
    sessionId: string,
    timelineId?: string,
  ): Promise<IAiSessionGraphDto>;
  createFeedback(
    sessionId: string,
    messageId: string,
    input: ICreateAiMessageFeedbackRequestDto,
  ): Promise<IAiSessionMessageFeedbackResponseDto>;
  createBranch(
    sessionId: string,
    input: ICreateAiBranchRequestDto,
  ): Promise<ICreateAiBranchResponseDto>;
  streamMessage(
    sessionId: string,
    timelineId: string,
    input: IGenerateAiSessionTurnRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void>;
  regenerateAssistant(
    sessionId: string,
    timelineId: string,
    input: IRegenerateAiAssistantRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void>;
  editUserAndRegenerate(
    sessionId: string,
    timelineId: string,
    input: IEditAiUserAndRegenerateRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void>;
}
