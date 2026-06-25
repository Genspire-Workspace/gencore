// file: packages\ai\src\index.ts

export type { AiMessageRole } from "./common/ai-message-role.js";
export type {
  IAiTextPart,
  IAiImagePart,
  IAiToolCallPart,
  IAiToolResultPart,
  IAiThinkingPart,
  AiContentPart,
  AiMessageContent,
} from "./common/ai-content-part.js";
export type { IAiMessage } from "./common/ai-message.js";
export type { IAiGenerationSettings, AiReasoningEffort } from "./common/ai-generation-settings.js";
export type { IAiModelRequest } from "./common/ai-model-request.js";
export type { IAiModelResponse } from "./common/ai-model-response.js";
export type { IAiModelChunk } from "./common/ai-model-chunk.js";
export type { AiStopReason } from "./common/ai-stop-reason.js";
export type { IAiTokenUsage } from "./common/ai-token-usage.js";

export type {
  ChatRole,
  ChatMessageContent,
  IChatMessage,
} from "./chat/chat-message.js";
export type { IChatGenerationSettings } from "./chat/chat-generation-settings.js";
export type { IChatGenerationRequest } from "./chat/chat-generation-request.js";
export type { IChatGenerationResponse } from "./chat/chat-generation-response.js";
export type { IChatGenerationChunk } from "./chat/chat-generation-chunk.js";
export type { IChatGenerator } from "./chat/chat-generator.js";

export type { IEmbeddingGenerationRequest } from "./embeddings/embedding-generation-request.js";
export type { IEmbeddingGenerationResponse, IEmbeddingVector } from "./embeddings/embedding-generation-response.js";
export type { IEmbeddingGenerator } from "./embeddings/embedding-generator.js";

export * from "./catalogue/index.js";
export * from "./catalogue/generated/index.js";

export type { IAiRuntimeProvider } from "./providers/runtime/ai-runtime-provider.js";
export { AiRuntimeProviderRegistry } from "./providers/runtime/ai-runtime-provider-registry.js";
export { openAiCompatibleProvider } from "./providers/openai-compatible/openai-compatible-provider.js";
export type {
  IOpenAiCompatibleProviderOptions,
  OpenAiContentBlock,
  OpenAiMessageContent,
} from "./providers/openai-compatible/openai-compatible-types.js";

export { anthropicCompatibleProvider } from "./providers/anthropic-compatible/anthropic-compatible-provider.js";
export type { IAnthropicCompatibleProviderOptions } from "./providers/anthropic-compatible/anthropic-compatible-types.js";

export { ollamaProvider } from "./providers/ollama/ollama-provider.js";
export type { IOllamaProviderOptions } from "./providers/ollama/ollama-provider.js";

export { AiService } from "./services/ai-service.js";
export { aiExtension } from "./extension/ai-extension.js";
export type { IAiDefaults, IAiExtensionOptions } from "./extension/ai-extension.js";

export { AiError } from "./errors/ai-error.js";
