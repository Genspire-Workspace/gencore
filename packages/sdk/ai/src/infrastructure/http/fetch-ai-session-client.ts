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
import { streamSseJson } from "../sse/stream-sse-json.js";

const AI_SESSION_API_PATH = "/api/v1/ai/sessions";
type FetchHeaders = Headers | Record<string, string>;

export interface IFetchAiSessionClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetch?: typeof globalThis.fetch;
  headers?: FetchHeaders;
}

export class FetchAiSessionClient implements IAiSessionTransport {
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: IFetchAiSessionClientOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async listSessions(): Promise<IAiSessionResponseDto[]> {
    const response = await this.request<{ items: IAiSessionResponseDto[] }>(
      AI_SESSION_API_PATH,
    );
    return response.items;
  }

  async createSession(
    input: ICreateAiSessionRequestDto = {},
  ): Promise<IAiSessionResponseDto> {
    return await this.request<IAiSessionResponseDto>(AI_SESSION_API_PATH, {
      method: "POST",
      body: input,
    });
  }

  async getSession(sessionId: string): Promise<IAiSessionResponseDto | null> {
    const response = await this.fetchImpl(this.resolveUrl(`${AI_SESSION_API_PATH}/${sessionId}`), {
      method: "GET",
      headers: await this.buildHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    return await this.readJsonOrThrow<IAiSessionResponseDto>(response);
  }

  async updateSession(
    sessionId: string,
    input: IUpdateAiSessionRequestDto,
  ): Promise<IAiSessionResponseDto> {
    return await this.request<IAiSessionResponseDto>(
      `${AI_SESSION_API_PATH}/${sessionId}`,
      {
        method: "PATCH",
        body: input,
      },
    );
  }

  async getSessionGraph(
    sessionId: string,
    timelineId?: string,
  ): Promise<IAiSessionGraphDto> {
    const suffix = timelineId ? `/timelines/${timelineId}/graph` : "/graph";
    return await this.request<IAiSessionGraphDto>(
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
    const accessToken = await this.resolveAccessToken();
    await streamSseJson<IAiSseEventDto>(
      {
        url: this.resolveUrl(
          `${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/generate`,
        ),
        accessToken,
        body: input,
        headers: this.options.headers,
        fetch: this.fetchImpl,
        signal: options?.signal,
      },
      onChunk,
    );
  }

  private async request<TResponse>(
    path: string,
    init?: {
      method?: string;
      body?: unknown;
    },
  ): Promise<TResponse> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: init?.method ?? "GET",
      headers: await this.buildHeaders(init?.body !== undefined),
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    return await this.readJsonOrThrow<TResponse>(response);
  }

  private async readJsonOrThrow<TResponse>(response: Response): Promise<TResponse> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Request failed with HTTP ${response.status}: ${errorBody}`,
      );
    }

    return (await response.json()) as TResponse;
  }

  private async buildHeaders(includeJson = false): Promise<Headers> {
    const headers = new Headers(this.options.headers);
    headers.set("accept", "application/json");
    if (includeJson) {
      headers.set("content-type", "application/json");
    }

    const accessToken = await this.resolveAccessToken();
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  private async resolveAccessToken(): Promise<string | null> {
    const getAccessToken = this.options.getAccessToken;
    if (!getAccessToken) {
      return null;
    }

    return await getAccessToken();
  }

  private resolveUrl(path: string): string {
    return `${this.options.baseUrl}${path}`;
  }
}
