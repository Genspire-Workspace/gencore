export type AiInputModality =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "file";

export type AiOutputModality =
  | "text"
  | "image"
  | "audio"
  | "embedding"
  | "tool-call";

export interface IAiModelCapabilities {
  chat?: boolean;
  completions?: boolean;
  embeddings?: boolean;
  streaming?: boolean;
  tools?: boolean;
  toolChoice?: boolean;
  parallelToolCalls?: boolean;
  structuredOutput?: boolean;
  jsonMode?: boolean;
  reasoning?: boolean;
  reasoningEffort?: boolean;
  reasoningBudgetTokens?: boolean;
  visibleReasoning?: boolean;
  vision?: boolean;
  audioInput?: boolean;
  audioOutput?: boolean;
  imageOutput?: boolean;
  promptCaching?: boolean;
  batch?: boolean;
  inputModalities: AiInputModality[];
  outputModalities: AiOutputModality[];
}
