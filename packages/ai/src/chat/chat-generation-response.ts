// file: packages\ai\src\chat\chat-generation-response.ts

import type { IChatMessage } from "./chat-message.js";
import type { IAiModelResponse } from "../common/ai-model-response.js";

export interface IChatGenerationResponse
  extends IAiModelResponse<IChatMessage> {
  id: string;
  message: IChatMessage;
}
