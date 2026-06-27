// file: packages/ai/src/domain/messages/ai-message-content.ts

import type { AiContentPart, AiMessageContent } from "./ai-content-part.js";

export function createTextAiMessageContent(text: string): AiMessageContent {
  return [
    {
      type: "text",
      text,
    },
  ];
}

export function normalizeAiMessageContent(
  content: string | AiMessageContent,
): AiMessageContent {
  if (typeof content === "string") {
    return createTextAiMessageContent(content);
  }

  return content.map((part) => ({ ...part })) as AiContentPart[];
}
