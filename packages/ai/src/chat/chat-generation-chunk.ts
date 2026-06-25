// file: packages\ai\src\chat\chat-generation-chunk.ts

import type { IChatMessage } from "./chat-message.js";
import type { IAiModelChunk } from "../common/ai-model-chunk.js";

export interface IChatGenerationChunk
  extends IAiModelChunk<string, IChatMessage> {
  id: string;
  delta?: string;
  reasoningDelta?: string;
  message?: IChatMessage;
}
