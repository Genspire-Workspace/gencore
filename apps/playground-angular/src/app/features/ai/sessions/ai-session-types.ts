// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-types.ts

import type {
  IAiSseEventDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionMessageResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineResponseDto,
  IAiSessionTimelineTurnItemDto,
  IAiSessionTimelineTurnListResponseDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IUpdateAiSessionRequestDto,
} from '@genspire/ai/server/contracts';
import type { IAiChatMessageDto } from '../shared/ai-chat.types';

export type { IAiChatMessageDto };

export type IAiSessionResponse = IAiSessionResponseDto & {
  defaultTimeline?: IAiSessionTimelineResponseDto;
};

export type IAiSessionMessageDto = IAiSessionMessageResponseDto;
export type IAiSessionListResponse = IAiSessionListResponseDto;
export type IAiSessionTimelineTurnListResponse =
  IAiSessionTimelineTurnListResponseDto;
export type IAiSessionTimelineTurnSnapshotDto = IAiSessionTimelineTurnItemDto;
export type IAiSessionGraphResponse = IAiSessionGraphDto;
export type IAiSessionCreateRequest = ICreateAiSessionRequestDto;
export type IAiSessionUpdateRequest = IUpdateAiSessionRequestDto;
export type IAiSessionMessageRequest = IGenerateAiSessionTurnRequestDto;
export type IAiSessionStreamChunk = IAiSseEventDto;
