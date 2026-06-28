import type {
  IAiAdminChatGenerateRequestDto,
  IAiAdminChatGenerateResponseDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiSseEventDto,
} from '@genspire/ai/server/contracts';

export type IAiGenerationRequest = IAiAdminChatGenerateRequestDto;
export type IAiGenerationResponse = IAiAdminChatGenerateResponseDto;
export type IAiGenerationStreamChunk = IAiSseEventDto;
export type IAiEmbeddingRequest = IAiEmbeddingGenerateRequestDto;
export type IAiEmbeddingResponse = IAiEmbeddingGenerateResponseDto;
