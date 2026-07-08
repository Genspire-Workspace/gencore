import type {
  IAiEmbeddingRequest,
  IAiEmbeddingResponse,
  IAiGenerateRequest,
  IAiGenerateResponse,
  IAiGenerateStreamChunk,
} from "../../domain/types/ai-session-sdk-types.js";
import type { IAiSessionStreamOptions } from "./ai-session-transport.js";

export interface IAiTransport {
  generateChat(input: IAiGenerateRequest): Promise<IAiGenerateResponse>;
  streamChat(
    input: IAiGenerateRequest,
    onChunk: (chunk: IAiGenerateStreamChunk) => void,
    options?: IAiSessionStreamOptions,
  ): Promise<void>;
  generateEmbedding(
    input: IAiEmbeddingRequest,
  ): Promise<IAiEmbeddingResponse>;
}
