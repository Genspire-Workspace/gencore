import type {
  IAiSessionGraphDto,
  IAiSessionResponseDto,
  IAiSseEventDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
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
  streamMessage(
    sessionId: string,
    timelineId: string,
    input: IGenerateAiSessionTurnRequestDto,
    onChunk: (chunk: IAiSseEventDto) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void>;
}
