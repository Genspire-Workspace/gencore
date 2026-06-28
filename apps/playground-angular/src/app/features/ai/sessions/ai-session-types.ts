// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-types.ts

import type {
  IAiSessionBranchListResponseDto as IAiSessionBranchListContractDto,
  IAiSessionBranchResponseDto as IAiSessionBranchContractDto,
  IAiSessionMessageFeedbackResponseDto as IAiSessionMessageFeedbackContractDto,
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
export type IAiSessionTimelineDto = IAiSessionTimelineResponseDto;
export type IAiSessionTimelineTurnListResponse =
  IAiSessionTimelineTurnListResponseDto;
export type IAiSessionTimelineTurnSnapshotDto = IAiSessionTimelineTurnItemDto;
export type IAiSessionGraphResponse = IAiSessionGraphDto;
export type IAiSessionBranchResponseDto = IAiSessionBranchContractDto;
export type IAiSessionBranchListResponseDto = IAiSessionBranchListContractDto;
export type IAiSessionMessageFeedbackResponseDto =
  IAiSessionMessageFeedbackContractDto;
export type IAiSessionCreateRequest = ICreateAiSessionRequestDto;
export type IAiSessionUpdateRequest = IUpdateAiSessionRequestDto;
export type IAiSessionMessageRequest = IGenerateAiSessionTurnRequestDto;
export type IAiSessionStreamChunk = IAiSseEventDto;
