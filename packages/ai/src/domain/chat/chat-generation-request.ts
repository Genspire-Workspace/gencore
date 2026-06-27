// file: packages/ai/src/domain/chat/chat-generation-request.ts

import type { IChatMessage } from "./chat-message.js";
import type { IChatGenerationSettings } from "./chat-generation-settings.js";
import type { IAiModelRequest } from "../generation/ai-model-request.js";
import type { IAiTool } from "../tools/ai-tool.js";

export interface IChatGenerationRequest
  extends IAiModelRequest<IChatMessage[], IChatGenerationSettings> {
  messages: IChatMessage[];
  tools?: IAiTool[];
}
