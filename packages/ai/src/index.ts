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
export type { IAiModelChunk, AiModelChunkType } from "./common/ai-model-chunk.js";
export type { AiStopReason } from "./common/ai-stop-reason.js";
export type { IAiTokenUsage, IAiInputTokenUsageDetails, IAiOutputTokenUsageDetails } from "./common/ai-token-usage.js";
export type {
  AiApiKeySource,
  IAiApiKey,
  IAiApiKeyResolveInput,
} from "./common/ai-api-key.js";
export {
  resolveAiApiKey,
  resolveAiApiKeyValue,
} from "./common/ai-api-key.js";

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

export type { AiClientKind } from "./clients/ai-client-kind.js";
export type { IAiClient } from "./clients/ai-client.js";
export { AiClientRegistry } from "./clients/ai-client-registry.js";
export type { IOpenAICompatibleClientOptions } from "./clients/openai-compatible/index.js";
export { OpenAICompatibleClient } from "./clients/openai-compatible/index.js";
export type { IOllamaClientOptions } from "./clients/ollama/index.js";
export { OllamaClient } from "./clients/ollama/index.js";

export type { AiProviderKind, IAiProvider } from "./common/ai-provider.js";
export type {
  AiModelModality,
  IAiModel,
  IAiModelBenchmark,
  IAiModelCost,
  IAiModelInterleaved,
  IAiModelLimit,
  IAiModelLink,
  IAiModelModalities,
} from "./common/ai-model.js";
export type { IAiLab } from "./common/ai-lab.js";
export type {
  IAiCatalogueData,
  IAiModelFilter,
  IAiProviderFilter,
} from "./catalogue/ai-catalogue.js";
export { AiCatalogue } from "./catalogue/ai-catalogue.js";
export * from "./catalogue/generated/index.js";

export { AiService } from "./services/ai-service.js";
export { aiExtension } from "./extension/ai-extension.js";
export type { IAiDefaults, IAiExtensionOptions } from "./extension/ai-extension.js";

export { AiError } from "./errors/ai-error.js";
