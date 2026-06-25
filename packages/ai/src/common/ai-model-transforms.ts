// file: packages\ai\src\common\ai-model-transforms.ts

import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";

export interface IModelTransformResult {
  providerOptions?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export type ModelTransform = (
  request: IChatGenerationRequest,
) => IModelTransformResult | undefined;
