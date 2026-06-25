// file: packages\ai\src\chat\chat-message.ts

import type { IAiMessage } from "../common/ai-message.js";
import type { AiMessageContent } from "../common/ai-content-part.js";
import type { AiMessageRole } from "../common/ai-message-role.js";

export type ChatRole = AiMessageRole;

export type ChatMessageContent = AiMessageContent;

export interface IChatMessage
  extends IAiMessage<ChatRole, ChatMessageContent> {}
