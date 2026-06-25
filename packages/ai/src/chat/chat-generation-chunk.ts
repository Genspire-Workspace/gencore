// file: packages\ai\src\chat\chat-generation-chunk.ts

import type { IChatMessage } from "./chat-message.js";
import type { IAiModelChunk } from "../common/ai-model-chunk.js";
import type { IAiToolCall } from "../tools/ai-tool-call.js";
import type { IAiToolResult } from "../tools/ai-tool-result.js";

export interface IChatGenerationChunk
  extends IAiModelChunk<string, IChatMessage> {
  id: string;
  delta?: string;
  reasoningDelta?: string;
  message?: IChatMessage;

  toolCall?: IAiToolCall;
  toolResult?: IAiToolResult;
}
