export type AiReasoningFormat =
  | "none"
  | "openai"
  | "anthropic-thinking"
  | "google-thinking"
  | "deepseek-reasoning-content"
  | "qwen-thinking"
  | "ollama-think-token"
  | "custom";

export type AiToolCallingMode =
  | "none"
  | "openai-tools"
  | "anthropic-tools"
  | "google-function-calling"
  | "mistral-tools"
  | "custom";

export interface IAiModelCompatibility {
  supportsSystemMessages?: boolean;
  supportsDeveloperMessages?: boolean;
  requiresAlternatingRoles?: boolean;
  allowsEmptyMessages?: boolean;
  reasoning?: {
    format: AiReasoningFormat;
    effortMap?: Partial<Record<string, string>>;
    requiresSpecialPromptToken?: boolean;
  };
  toolCalling?: {
    mode: AiToolCallingMode;
    supportsStreamingToolCalls?: boolean;
    requiresToolResultAfterToolCall?: boolean;
  };
  parameters?: {
    temperature?: boolean;
    topP?: boolean;
    topK?: boolean;
    maxTokens?: boolean;
    stop?: boolean;
    seed?: boolean;
    responseFormat?: boolean;
  };
  quirks?: string[];
}
