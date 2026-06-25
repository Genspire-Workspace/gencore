import type { IAiModelCapabilities } from "./ai-model-capability.js";
import type { IAiModelLimits } from "./ai-model-limits.js";
import type { IAiModelPricing } from "./ai-model-pricing.js";
import type { IAiModelSource } from "./ai-model-source.js";
import type { IAiModelCompatibility } from "./ai-model-compatibility.js";

export type AiModelKind =
  | "chat"
  | "embedding"
  | "image-generation"
  | "audio-generation"
  | "speech-to-text"
  | "reranker"
  | "moderation"
  | "multimodal";

export interface IAiModel {
  id: string;
  displayName: string;
  ownerProviderId: string;
  kind: AiModelKind;
  familyId?: string;
  version?: string;
  releaseDate?: string;
  description?: string;
  capabilities: IAiModelCapabilities;
  limits?: IAiModelLimits;
  pricing?: IAiModelPricing;
  compatibility?: IAiModelCompatibility;
  tags?: string[];
  source?: IAiModelSource;
  metadata?: Record<string, unknown>;
}
