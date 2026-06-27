// file: apps/playground-app-ai/src/verify/shared/capabilities.ts

import {
  defaultAiCatalogue,
  type AiCatalogue,
} from "../../../../../packages/ai/src/catalogue/index.js";
import type { AiModelModality } from "../../../../../packages/ai/src/domain/models/ai-model.js";

export type { AiModelModality } from "../../../../../packages/ai/src/domain/models/ai-model.js";

export interface IDefaultModelCapabilities {
  inputModalities?: AiModelModality[];
  reasoning?: boolean;
  toolCall?: boolean;
}

export interface IModelCapabilities {
  modelId: string;
  source: "catalogue" | "defaults";
  inputModalities: AiModelModality[];
  supportsImage: boolean;
  supportsReasoning: boolean;
  supportsToolCall: boolean;
}

export function resolveModelCapabilities(
  modelId: string,
  defaults?: IDefaultModelCapabilities,
  catalogue: AiCatalogue = defaultAiCatalogue,
): IModelCapabilities {
  const model = catalogue.getModel(modelId);

  if (model) {
    const inputModalities = [...model.modalities.input];

    return {
      modelId,
      source: "catalogue",
      inputModalities,
      supportsImage: inputModalities.includes("image"),
      supportsReasoning: Boolean(model.reasoning),
      supportsToolCall: Boolean(model.tool_call),
    };
  }

  const inputModalities = defaults?.inputModalities ?? ["text"];

  return {
    modelId,
    source: "defaults",
    inputModalities,
    supportsImage: inputModalities.includes("image"),
    supportsReasoning: Boolean(defaults?.reasoning),
    supportsToolCall: Boolean(defaults?.toolCall),
  };
}

export function formatModelCapabilities(capabilities: IModelCapabilities): string {
  return `input=[${capabilities.inputModalities.join(",")}] supportsImage=${capabilities.supportsImage} supportsReasoning=${capabilities.supportsReasoning} supportsToolCall=${capabilities.supportsToolCall} (source=${capabilities.source})`;
}