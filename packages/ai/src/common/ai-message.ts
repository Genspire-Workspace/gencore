// file: packages\ai\src\common\ai-message.ts

import type { AiMessageContent } from "./ai-content-part.js";
import type { AiMessageRole } from "./ai-message-role.js";

export interface IAiMessage<
  TRole extends string = AiMessageRole,
  TContent = AiMessageContent,
> {
  role: TRole;
  content: TContent;
  name?: string;
  metadata?: Record<string, unknown>;
}
