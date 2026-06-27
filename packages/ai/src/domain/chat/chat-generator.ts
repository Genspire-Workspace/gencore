// file: packages/ai/src/domain/chat/chat-generator.ts

import type { IChatGenerationRequest } from "./chat-generation-request.js";
import type { IChatGenerationResponse } from "./chat-generation-response.js";
import type { IChatGenerationChunk } from "./chat-generation-chunk.js";

export interface IChatGenerator {
  generateChat(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse>;

  streamChat(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk>;
}
