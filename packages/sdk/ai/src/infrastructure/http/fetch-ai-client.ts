import type {
  IAiEmbeddingRequest,
  IAiEmbeddingResponse,
  IAiGenerateRequest,
  IAiGenerateResponse,
  IAiGenerateStreamChunk,
} from "../../domain/types/ai-session-sdk-types.js";
import type { IAiTransport } from "../../application/contracts/ai-transport.js";
import type { IAiSessionStreamOptions } from "../../application/contracts/ai-session-transport.js";
import {
  FetchAiHttpTransport,
  type IFetchAiHttpTransportOptions,
} from "./fetch-ai-http-transport.js";

const AI_GENERATION_API_PATH = "/api/v1/ai/generation";

export interface IFetchAiClientOptions extends IFetchAiHttpTransportOptions {}

export class FetchAiClient implements IAiTransport {
  private readonly transport: FetchAiHttpTransport;

  constructor(options: IFetchAiClientOptions | FetchAiHttpTransport) {
    this.transport =
      options instanceof FetchAiHttpTransport
        ? options
        : new FetchAiHttpTransport(options);
  }

  async generateChat(input: IAiGenerateRequest): Promise<IAiGenerateResponse> {
    return await this.transport.post<IAiGenerateResponse>(
      `${AI_GENERATION_API_PATH}/chat/generate`,
      input,
    );
  }

  async streamChat(
    input: IAiGenerateRequest,
    onChunk: (chunk: IAiGenerateStreamChunk) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void> {
    await this.transport.postSse<IAiGenerateStreamChunk>(
      `${AI_GENERATION_API_PATH}/chat/generate`,
      {
        ...input,
        settings: {
          ...input.settings,
          stream: true,
        },
      },
      onChunk,
      {
        signal: options?.signal,
      },
    );
  }

  async generateEmbedding(
    input: IAiEmbeddingRequest,
  ): Promise<IAiEmbeddingResponse> {
    return await this.transport.post<IAiEmbeddingResponse>(
      `${AI_GENERATION_API_PATH}/embeddings/generate`,
      input,
    );
  }
}
