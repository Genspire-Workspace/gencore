// file: packages/ai/src/domain/chat/chat-message.ts

import type { IAiMessage } from "../messages/ai-message.js";
import type { AiMessageContent } from "../messages/ai-content-part.js";
import type { AiMessageRole } from "../messages/ai-message-role.js";

export type ChatRole = AiMessageRole;

export type ChatMessageContent = AiMessageContent;

export interface IChatMessage
  extends IAiMessage<ChatRole, ChatMessageContent> {}
