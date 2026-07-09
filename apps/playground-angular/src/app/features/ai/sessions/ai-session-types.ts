// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-types.ts

import type {
  IAiSessionAttachment as IAiSdkSessionAttachment,
  IAiSessionClientState as IAiSdkSessionClientState,
  IAiSessionGraphDto,
  IAiSessionResponseDto,
  IAiSessionStreamOptions,
  IAiSessionViewMessage as IAiSdkSessionViewMessage,
} from '@genspire/sdk-ai';
import type {
  IAiSessionBranchListResponseDto as IAiSessionBranchListContractDto,
  IAiSessionBranchResponseDto as IAiSessionBranchContractDto,
  IAiSessionMessageFeedbackResponseDto as IAiSessionMessageFeedbackContractDto,
  IAiSseEventDto,
  IAiSessionListResponseDto,
  ICreateAiSessionBranchResponseDto,
  IAiSessionMessageResponseDto,
  IAiSessionTimelineResponseDto,
  IAiSessionTimelineTurnItemDto,
  IAiSessionTimelineTurnListResponseDto,
  ICreateAiSessionRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IUpdateAiSessionRequestDto,
} from '@genspire/ai/server/contracts';
import type { IAiChatMessageDto } from '../shared/ai-chat.types';
import type { IChatComposerAttachment, IUiChatMessage } from '../chat/chat-message.types';

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
export type IAiSessionBranchSessionResponseDto = ICreateAiSessionBranchResponseDto;
export type IAiSessionMessageFeedbackResponseDto =
  IAiSessionMessageFeedbackContractDto;
export type IAiSessionCreateRequest = ICreateAiSessionRequestDto;
export type IAiSessionUpdateRequest = IUpdateAiSessionRequestDto;
export type IAiSessionMessageRequest = IGenerateAiSessionTurnRequestDto;
export type IAiSessionStreamChunk = IAiSseEventDto;
export type IAiSessionUiMessage = IAiSdkSessionViewMessage & IUiChatMessage;
export type IAiSessionUiAttachment = IAiSdkSessionAttachment & IChatComposerAttachment;
export interface IAiSessionSettings {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface IAiSessionConfigDraft {
  title: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: string;
  topP: string;
  maxTokens: string;
}

export interface IAiSessionClientState
  extends Omit<IAiSdkSessionClientState, 'messages' | 'attachments'> {
  messages: IAiSessionUiMessage[];
  attachments: IAiSessionUiAttachment[];
}
export type { IAiSessionStreamOptions };
