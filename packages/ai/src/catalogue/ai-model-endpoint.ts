import type { AiProviderProtocol } from "./ai-provider-protocol.js";
import type { IAiModelPricing } from "./ai-model-pricing.js";
import type { IAiModelLimits } from "./ai-model-limits.js";
import type { IAiModelCompatibility } from "./ai-model-compatibility.js";

export interface IAiModelEndpoint {
  id: string;
  modelId: string;
  providerId: string;
  providerModelId: string;
  protocol: AiProviderProtocol;
  baseUrl?: string;
  limits?: IAiModelLimits;
  pricing?: IAiModelPricing;
  compatibility?: IAiModelCompatibility;
  enabled?: boolean;
  deprecated?: boolean;
  source?: {
    id: string;
    url?: string;
    fetchedAt?: string;
  };
  metadata?: Record<string, unknown>;
}
