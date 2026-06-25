import type { IAiModelEndpoint } from "../ai-model-endpoint.js";

export const AI_MODEL_ENDPOINTS = [
  {
    id: "openai:openai/gpt-4.1",
    modelId: "openai/gpt-4.1",
    providerId: "openai",
    providerModelId: "gpt-4.1",
    protocol: "openai-responses",
    enabled: true,
  },
  {
    id: "openai:openai/text-embedding-3-small",
    modelId: "openai/text-embedding-3-small",
    providerId: "openai",
    providerModelId: "text-embedding-3-small",
    protocol: "openai-embeddings",
    enabled: true,
  },
  {
    id: "anthropic:anthropic/claude-sonnet-4",
    modelId: "anthropic/claude-sonnet-4",
    providerId: "anthropic",
    providerModelId: "claude-sonnet-4-20250514",
    protocol: "anthropic-messages",
    enabled: true,
  },
  {
    id: "openrouter:anthropic/claude-sonnet-4",
    modelId: "anthropic/claude-sonnet-4",
    providerId: "openrouter",
    providerModelId: "anthropic/claude-sonnet-4",
    protocol: "openai-compatible",
    enabled: true,
    compatibility: {
      toolCalling: {
        mode: "openai-tools",
      },
      reasoning: {
        format: "custom",
      },
    },
  },
] as const satisfies readonly IAiModelEndpoint[];
