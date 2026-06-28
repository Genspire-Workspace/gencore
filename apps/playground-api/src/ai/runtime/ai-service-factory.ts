import { AiClientRegistry as AiProviderClientRegistry } from "@genspire/ai/providers";
import { OpenAICompatibleClient } from "@genspire/ai/providers/openai-compatible";
import { AiGenerationService } from "@genspire/ai/application";
import { AiToolRegistry } from "@genspire/ai/application";
import {
  createAiPlaygroundProviderDefinitions,
  type IAiPlaygroundProviderInfo,
} from "../providers/ai-provider-definition.js";
import { AiProviderModelResolver } from "../providers/ai-provider-model-resolver.js";
import { playgroundAiSmokeToolRegistry } from "./ai-smoke-tools.js";

export interface IAiPlaygroundRuntime {
  registry: AiProviderClientRegistry;
  service: AiGenerationService;
  resolver: AiProviderModelResolver;
  providers: IAiPlaygroundProviderInfo[];
  serverToolRegistry: AiToolRegistry;
}

export function createAiPlaygroundRuntime(): IAiPlaygroundRuntime {
  const registry = new AiProviderClientRegistry();
  const providerDefinitions = createAiPlaygroundProviderDefinitions();

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

  for (const providerDefinition of providerDefinitions) {
    if (!providerDefinition.client) {
      continue;
    }

    registry.register(
      new OpenAICompatibleClient({
        id: providerDefinition.id,
        name: providerDefinition.name,
        ...providerDefinition.client,
      }),
    );
  }

  const resolver = new AiProviderModelResolver(defaults);
  const service = new AiGenerationService(registry, {
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
    providers: providerDefinitions.map(({ client: _client, ...provider }) => ({
      ...provider,
    })),
  };
}

export const aiPlaygroundRuntime = createAiPlaygroundRuntime();
