// file: packages\ai\src\clients\ai-client-kind.ts

export type AiClientKind =
  | "openai"
  | "anthropic"
  | "google"
  | "amazon-bedrock"
  | "openai-compatible"
  | "ollama"
  | "custom";
