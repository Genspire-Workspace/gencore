// file: packages\ai\src\model-transforms\registry.ts

import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type {
  IModelTransformResult,
  ModelTransform,
} from "../common/ai-model-transforms.js";
import { deepseekTransform } from "./deepseek.js";

const MODEL_TRANSFORMS: Record<string, ModelTransform> = {
  "deepseek-v4": deepseekTransform,
  "deepseek-chat": deepseekTransform,
  "deepseek-reasoner": deepseekTransform,
};

function normalizeModelId(modelId: string): string {
  return modelId.toLowerCase();
}

export function applyModelTransform(
  modelId: string | undefined,
  request: IChatGenerationRequest,
): IModelTransformResult | undefined {
  if (!modelId) return undefined;

  const key = normalizeModelId(modelId);

  for (const [pattern, transform] of Object.entries(MODEL_TRANSFORMS)) {
    if (key.startsWith(pattern)) {
      return transform(request);
    }
  }

  return undefined;
}
