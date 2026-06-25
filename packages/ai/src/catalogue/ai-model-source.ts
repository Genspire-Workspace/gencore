export type AiModelSourceKind =
  | "models.dev"
  | "openrouter"
  | "vercel-ai-gateway"
  | "manual"
  | "provider-api"
  | "custom";

export interface IAiModelSource {
  kind: AiModelSourceKind;
  url?: string;
  fetchedAt?: string;
  rawId?: string;
  confidence?: "high" | "medium" | "low";
}
