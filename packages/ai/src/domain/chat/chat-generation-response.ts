// file: packages/ai/src/domain/chat/chat-generation-response.ts

import type { IChatMessage } from "./chat-message.js";
import type { IAiModelResponse } from "../generation/ai-model-response.js";
import type { IAiToolCall } from "../tools/ai-tool-call.js";
import type { IAiToolResult } from "../tools/ai-tool-result.js";

export interface IChatGenerationResponse
  extends IAiModelResponse<IChatMessage> {
  id: string;
  message: IChatMessage;

  toolCalls?: IAiToolCall[];
  toolResults?: IAiToolResult[];
}
