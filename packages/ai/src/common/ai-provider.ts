import type { AiClientKind } from "../clients/ai-client-kind.js";

export type AiProviderKind =
  | "first-party"
  | "gateway"
  | "cloud"
  | "local"
  | "aggregator"
  | "custom";

export interface IAiProvider {
  id: string;
  name: string;
  env?: string[];
  npm?: string;
  api?: string;
  doc?: string;
  website?: string;
  models?: number;
  clientKind: AiClientKind;
  kind: AiProviderKind;
  metadata?: Record<string, unknown>;
}
