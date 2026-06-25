import type { AiProviderProtocol } from "./ai-provider-protocol.js";

export type AiProviderKind =
  | "first-party"
  | "gateway"
  | "cloud"
  | "local"
  | "aggregator"
  | "custom";

export interface IAiProviderAuth {
  type: "none" | "api-key" | "bearer" | "custom";
  envVar?: string;
  headerName?: string;
  queryParamName?: string;
}

export interface IAiProvider {
  id: string;
  displayName: string;
  kind: AiProviderKind;
  baseUrl?: string;
  protocols: AiProviderProtocol[];
  auth?: IAiProviderAuth;
  defaultChatModelId?: string;
  defaultEmbeddingModelId?: string;
  websiteUrl?: string;
  docsUrl?: string;
  iconUrl?: string;
  enabledByDefault?: boolean;
  metadata?: Record<string, unknown>;
}
