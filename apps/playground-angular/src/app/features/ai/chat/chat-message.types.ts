// file: apps\playground-angular\src\app\features\ai\chat\chat-message.types.ts

import type {
  AiMessageContent,
  AiMessageRole,
  IAiFilePart,
  IAiImagePart,
} from '@genspire/ai/domain/messages';

export type IChatComposerReferenceKind = 'prompt' | 'skill' | 'tool';

export interface IUiChatMessage {
  id: string;
  role: AiMessageRole;
  content: AiMessageContent;
  pending?: boolean;
  actions?: IUiChatMessageActions | false;
  feedback?: IUiChatMessageFeedbackValue | null;
}

export type IUiChatMessageFeedbackValue = 'good' | 'bad';

export interface IUiChatMessageActions {
  copy?: boolean;
  edit?: boolean;
  feedback?: boolean;
  regenerate?: boolean;
  branch?: boolean;
}

export interface IUiChatMessageActionEvent {
  message: IUiChatMessage;
}

export interface IUiChatMessageFeedbackEvent extends IUiChatMessageActionEvent {
  value: IUiChatMessageFeedbackValue;
}

export interface IChatComposerAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  part: IAiImagePart | IAiFilePart;
}

export interface IChatComposerPromptVariableValue {
  name: string;
  description?: string;
  required?: boolean;
  value: string;
}

export interface IChatComposerReferenceBase {
  id: string;
  kind: IChatComposerReferenceKind;
  name: string;
  iconName: string;
  description?: string;
}

export interface IChatComposerPromptReference extends IChatComposerReferenceBase {
  kind: 'prompt';
  promptId: string;
  argumentHint?: string;
  variables: IChatComposerPromptVariableValue[];
}

export interface IChatComposerSkillReference extends IChatComposerReferenceBase {
  kind: 'skill';
  skillId: string;
}

export interface IChatComposerToolReference extends IChatComposerReferenceBase {
  kind: 'tool';
  toolId: string;
}

export type IChatComposerReference =
  | IChatComposerPromptReference
  | IChatComposerSkillReference
  | IChatComposerToolReference;

export type UiChatMessageContent = AiMessageContent;
