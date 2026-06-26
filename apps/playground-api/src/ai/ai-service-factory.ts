// file: apps\playground-api\src\ai\ai-service-factory.ts

import { AiClientRegistry } from "../../../../packages/ai/src/clients/ai-client-registry.js";
import { OpenAICompatibleClient } from "../../../../packages/ai/src/clients/openai-compatible/index.js";
import { AiService } from "../../../../packages/ai/src/services/ai-service.js";
import { AiToolRegistry } from "../../../../packages/ai/src/tools/ai-tool-registry.js";
import { AiProviderModelResolver } from "./ai-provider-model-resolver.js";
import { playgroundAiSmokeToolRegistry } from "./ai-smoke-tools.js";

export interface IAiPlaygroundProviderInfo {
  id: string;
  name: string;
  kind: string;
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  defaultChatModel?: string;
  defaultEmbeddingModel?: string;
  host?: string;
  configured: boolean;
}

export interface IAiPlaygroundRuntime {
  registry: AiClientRegistry;
  service: AiService;
  resolver: AiProviderModelResolver;
  providers: IAiPlaygroundProviderInfo[];
  serverToolRegistry: AiToolRegistry;
}

function createOllamaHeaders(): Record<string, string> | undefined {
  const apiKey = process.env.OLLAMA_API_KEY?.trim();

  if (!apiKey) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

export function createAiPlaygroundRuntime(): IAiPlaygroundRuntime {
  const registry = new AiClientRegistry();

  const defaults = {
    chatProvider: process.env.AI_CHAT_PROVIDER ?? "ollama",
    chatModel:
      process.env.AI_CHAT_MODEL ??
      process.env.OLLAMA_CHAT_MODEL ??
      "gemma4:12b",
    embeddingProvider: process.env.AI_EMBEDDING_PROVIDER ?? "ollama",
    embeddingModel:
      process.env.AI_EMBEDDING_MODEL ??
      process.env.OLLAMA_EMBED_MODEL ??
      "embeddinggemma:latest",
  };

  const ollamaHost = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  const ollamaDefaultChatModel =
    process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b";
  const ollamaDefaultEmbeddingModel =
    process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest";
  const deepseekDefaultChatModel =
    process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-v4-flash";
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY);

  registry.register(
    new OpenAICompatibleClient({
      id: "ollama",
      name: "Ollama",
      baseURL: `${ollamaHost.replace(/\/$/, "")}/v1`,
      headers: createOllamaHeaders(),
    }),
  );

  if (deepseekConfigured) {
    registry.register(
      new OpenAICompatibleClient({
        id: "deepseek",
        name: "DeepSeek",
        baseURL:
          process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }),
    );
  }

  const resolver = new AiProviderModelResolver(defaults);
  const service = new AiService(registry, {
    chatProvider: defaults.chatProvider,
    chatModel: defaults.chatModel,
    embeddingProvider: defaults.embeddingProvider,
    embeddingModel: defaults.embeddingModel,
  });

  return {
    registry,
    service,
    resolver,
    serverToolRegistry: playgroundAiSmokeToolRegistry,
    providers: [
      {
        id: "ollama",
        name: "Ollama",
        kind: "ollama",
        supportsChat: true,
        supportsEmbeddings: true,
        defaultChatModel: ollamaDefaultChatModel,
        defaultEmbeddingModel: ollamaDefaultEmbeddingModel,
        host: ollamaHost,
        configured: true,
      },
      {
        id: "deepseek",
        name: "DeepSeek",
        kind: "openai-compatible",
        supportsChat: true,
        supportsEmbeddings: false,
        defaultChatModel: deepseekDefaultChatModel,
        configured: deepseekConfigured,
      },
    ],
  };
}

export const aiPlaygroundRuntime = createAiPlaygroundRuntime();
