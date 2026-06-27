// file: packages/ai/src/domain/messages/index.ts

export type { AiMessageRole } from "./ai-message-role.js";
export type {
  IAiTextPart,
  IAiImagePart,
  IAiToolCallPart,
  IAiToolResultPart,
  IAiThinkingPart,
  AiContentPart,
} from "./ai-content-part.js";
export type { AiMessageContent } from "./ai-content-part.js";
export {
  createTextAiMessageContent,
  normalizeAiMessageContent,
} from "./ai-message-content.js";
export type { IAiMessage } from "./ai-message.js";