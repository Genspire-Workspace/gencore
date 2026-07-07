import type {
  IAiChatGenerateRequestDto,
  IAiChatGenerateResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
} from '@genspire/ai/server/contracts';

export type IAiGenerationRequest = IAiChatGenerateRequestDto;
export type IAiGenerationResponse = IAiChatGenerateResponseDto;
export type IAiGenerationStreamChunk = IAiSseEventDto;
export type IAiEmbeddingRequest = IAiEmbeddingGenerateRequestDto;
export type IAiEmbeddingResponse = IAiEmbeddingGenerateResponseDto;
