// file: apps\playground-angular\src\app\features\ai\chat\chat-message.types.ts

import type {
  AiMessageContent,
  AiMessageRole,
  IAiFilePart,
  IAiImagePart,
} from '@genspire/ai/domain/messages';

export interface IUiChatMessage {
  id: string;
  role: AiMessageRole;
  content: AiMessageContent;
  pending?: boolean;
}

export interface IChatComposerAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  part: IAiImagePart | IAiFilePart;
}

export type UiChatMessageContent = AiMessageContent;
