import type {
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  IDeleteAiSessionResponseDto,
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
import type {
  IAiSessionStreamOptions,
  IAiSessionTransport,
} from "../../application/contracts/ai-session-transport.js";
import {
  FetchAiHttpTransport,
  type IFetchAiHttpTransportOptions,
} from "./fetch-ai-http-transport.js";

const AI_SESSION_API_PATH = "/api/v1/ai/sessions";

export interface IFetchAiSessionClientOptions extends IFetchAiHttpTransportOptions {}

export class FetchAiSessionClient implements IAiSessionTransport {
  private readonly transport: FetchAiHttpTransport;

  constructor(options: IFetchAiSessionClientOptions | FetchAiHttpTransport) {
    this.transport =
      options instanceof FetchAiHttpTransport
        ? options
        : new FetchAiHttpTransport(options);
  }

  async listSessions(): Promise<IAiSessionResponseDto[]> {
    const response = await this.transport.get<{ items: IAiSessionResponseDto[] }>(
      AI_SESSION_API_PATH,
    );
    return response.items;
  }

  async createSession(
    input: ICreateAiSessionRequestDto = {},
  ): Promise<IAiSessionResponseDto> {
    return await this.transport.post<IAiSessionResponseDto>(AI_SESSION_API_PATH, input);
  }

  async getSession(sessionId: string): Promise<IAiSessionResponseDto | null> {
    return await this.transport.getNullable<IAiSessionResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}`,
    );
  }

  async deleteSession(sessionId: string): Promise<IDeleteAiSessionResponseDto> {
    return await this.transport.delete<IDeleteAiSessionResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}`,
    );
  }

  async updateSession(
    sessionId: string,
    input: IUpdateAiSessionRequestDto,
  ): Promise<IAiSessionResponseDto> {
    return await this.transport.patch<IAiSessionResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}`,
      input,
    );
  }

  async getSessionGraph(
    sessionId: string,
    timelineId?: string,
  ): Promise<IAiSessionGraphDto> {
    const suffix = timelineId ? `/timelines/${timelineId}/graph` : "/graph";
    return await this.transport.get<IAiSessionGraphDto>(
      `${AI_SESSION_API_PATH}/${sessionId}${suffix}`,
    );
  }

  async createFeedback(
    sessionId: string,
    messageId: string,
    input: ICreateAiMessageFeedbackRequestDto,
  ): Promise<IAiSessionMessageFeedbackResponseDto> {
    return await this.transport.post<IAiSessionMessageFeedbackResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}/messages/${messageId}/feedback`,
      input,
    );
  }

  async createBranch(
    sessionId: string,
    input: ICreateAiBranchRequestDto,
  ): Promise<ICreateAiBranchResponseDto> {
    return await this.transport.post<ICreateAiBranchResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}/branches`,
      input,
    );
  }

  async streamMessage(
    sessionId: string,
    timelineId: string,
    input: IGenerateAiSessionTurnRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void> {
    await this.transport.postSse<IAiSessionStreamEvent>(
      `${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/generate`,
      input,
      onChunk,
      {
        signal: options?.signal,
      },
    );
  }

  async regenerateAssistant(
    sessionId: string,
    timelineId: string,
    input: IRegenerateAiAssistantRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void> {
    await this.transport.postSse<IAiSessionStreamEvent>(
      `${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/regenerate-assistant`,
      input,
      onChunk,
      {
        signal: options?.signal,
      },
    );
  }

  async editUserAndRegenerate(
    sessionId: string,
    timelineId: string,
    input: IEditAiUserAndRegenerateRequestDto,
    onChunk: (chunk: IAiSessionStreamEvent) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void> {
    await this.transport.postSse<IAiSessionStreamEvent>(
      `${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/edit-user-and-regenerate`,
      input,
      onChunk,
      {
        signal: options?.signal,
      },
    );
  }
}
