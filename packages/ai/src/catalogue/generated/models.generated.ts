import type { IAiModel } from "../ai-model.js";

export const AI_MODELS = [
  {
    id: "openai/gpt-4.1",
    displayName: "GPT-4.1",
    ownerProviderId: "openai",
    kind: "chat",
    capabilities: {
      chat: true,
      streaming: true,
      tools: true,
      toolChoice: true,
      structuredOutput: true,
      jsonMode: true,
      reasoning: false,
      vision: true,
      inputModalities: ["text", "image"],
      outputModalities: ["text", "tool-call"],
    },
    compatibility: {
      supportsSystemMessages: true,
      supportsDeveloperMessages: true,
      toolCalling: {
        mode: "openai-tools",
        supportsStreamingToolCalls: true,
      },
      parameters: {
        temperature: true,
        topP: true,
        maxTokens: true,
        stop: true,
        responseFormat: true,
      },
    },
    source: {
      kind: "manual",
      confidence: "medium",
    },
  },
  {
    id: "openai/text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    ownerProviderId: "openai",
    kind: "embedding",
    capabilities: {
      embeddings: true,
      inputModalities: ["text"],
      outputModalities: ["embedding"],
    },
    limits: {
      defaultEmbeddingDimensions: 1536,
      embeddingDimensions: [1536],
    },
    source: {
      kind: "manual",
      confidence: "medium",
    },
  },
  {
    id: "anthropic/claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    ownerProviderId: "anthropic",
    kind: "chat",
    capabilities: {
      chat: true,
      streaming: true,
      tools: true,
      toolChoice: true,
      reasoning: true,
      reasoningBudgetTokens: true,
      vision: true,
      inputModalities: ["text", "image"],
      outputModalities: ["text", "tool-call"],
    },
    compatibility: {
      supportsSystemMessages: true,
      supportsDeveloperMessages: false,
      toolCalling: {
        mode: "anthropic-tools",
      },
      reasoning: {
        format: "anthropic-thinking",
      },
    },
    source: {
      kind: "manual",
      confidence: "medium",
    },
  },
] as const satisfies readonly IAiModel[];
