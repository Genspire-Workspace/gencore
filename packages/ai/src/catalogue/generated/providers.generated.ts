import type { IAiProvider } from "../ai-provider.js";

export const AI_PROVIDERS = [
  {
    id: "openai",
    displayName: "OpenAI",
    kind: "first-party",
    baseUrl: "https://api.openai.com/v1",
    protocols: ["openai-responses", "openai-chat-completions", "openai-embeddings"],
    auth: {
      type: "bearer",
      envVar: "OPENAI_API_KEY",
    },
    defaultChatModelId: "openai/gpt-4.1",
    defaultEmbeddingModelId: "openai/text-embedding-3-small",
    enabledByDefault: false,
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    kind: "first-party",
    baseUrl: "https://api.anthropic.com/v1",
    protocols: ["anthropic-messages"],
    auth: {
      type: "api-key",
      envVar: "ANTHROPIC_API_KEY",
      headerName: "x-api-key",
    },
    defaultChatModelId: "anthropic/claude-sonnet-4",
    enabledByDefault: false,
  },
  {
    id: "openrouter",
    displayName: "OpenRouter",
    kind: "aggregator",
    baseUrl: "https://openrouter.ai/api/v1",
    protocols: ["openai-compatible"],
    auth: {
      type: "bearer",
      envVar: "OPENROUTER_API_KEY",
    },
    enabledByDefault: false,
  },
  {
    id: "ollama",
    displayName: "Ollama",
    kind: "local",
    baseUrl: "http://localhost:11434/v1",
    protocols: ["openai-compatible", "ollama-chat", "ollama-embeddings"],
    auth: {
      type: "none",
    },
    enabledByDefault: true,
  },
] as const satisfies readonly IAiProvider[];
