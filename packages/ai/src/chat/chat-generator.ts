// file: packages\ai\src\chat\chat-generator.ts

import type { IChatGenerationRequest } from "./chat-generation-request.js";
import type { IChatGenerationResponse } from "./chat-generation-response.js";
import type { IChatGenerationChunk } from "./chat-generation-chunk.js";

export interface IChatGenerator {
  generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse>;

  streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk>;
}
