import type {
  IAiSessionGraphDto,
  IAiSessionResponseDto,
  IAiSseEventDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
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

  async streamMessage(
    sessionId: string,
    timelineId: string,
    input: IGenerateAiSessionTurnRequestDto,
    onChunk: (chunk: IAiSseEventDto) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void> {
    await this.transport.postSse<IAiSseEventDto>(
      `${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/generate`,
      input,
      onChunk,
      {
        signal: options?.signal,
      },
    );
  }
}
