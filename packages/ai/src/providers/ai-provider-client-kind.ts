// file: packages/ai/src/providers/ai-provider-client-kind.ts

export const DEFAULT_AI_PROVIDER_CLIENT_KINDS = [
  "openai-compatible",
  "anthropic-compatible",
  "google-compatible",
] as const;

export type DefaultAiProviderClientKind = (typeof DEFAULT_AI_PROVIDER_CLIENT_KINDS)[number];

export type AiProviderClientKind =
| DefaultAiProviderClientKind
  | "openai"
  | "anthropic"
  | "google"
  | "amazon-bedrock"
  | "ollama"
  | "custom";
