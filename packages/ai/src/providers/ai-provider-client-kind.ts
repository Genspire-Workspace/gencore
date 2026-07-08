// file: packages/ai/src/providers/ai-provider-client-kind.ts

export const DEFAULT_AI_PROVIDER_CLIENT_KINDS = [
  "openai-compatible",
  "anthropic-compatible",
  "google-compatible",
  "ollama",
] as const;

export type DefaultAiProviderClientKind = (typeof DEFAULT_AI_PROVIDER_CLIENT_KINDS)[number];

export const AI_PROVIDER_CLIENT_KINDS = [
  ...DEFAULT_AI_PROVIDER_CLIENT_KINDS,
  "openai",
  "anthropic",
  "google",
  "amazon-bedrock",
  "custom",
] as const;

export type AiProviderClientKind = (typeof AI_PROVIDER_CLIENT_KINDS)[number];
