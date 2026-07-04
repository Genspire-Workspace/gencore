import { AiClientRegistry as AiProviderClientRegistry } from "@genspire/ai/providers";
import { AiGenerationService, AiProviderRuntimeCatalogue } from "@genspire/ai/application";
import { AiToolRegistry } from "@genspire/ai/application";
import { playgroundAiSmokeToolRegistry } from "./ai-smoke-tools.js";

export interface IAiPlaygroundRuntime {
  registry: AiProviderClientRegistry;
  service: AiGenerationService;
  providerCatalogue: AiProviderRuntimeCatalogue;
  serverToolRegistry: AiToolRegistry;
}

export function createAiPlaygroundRuntime(): IAiPlaygroundRuntime {
  const registry = new AiProviderClientRegistry();
  const providerCatalogue = AiProviderRuntimeCatalogue.createDefault();

  for (const client of providerCatalogue.createClients()) {
    registry.register(client);
  }

  const service = new AiGenerationService(
    registry,
    providerCatalogue.getDefaults(),
    providerCatalogue,
  );

  return {
    registry,
    service,
    providerCatalogue,
    serverToolRegistry: playgroundAiSmokeToolRegistry,
  };
}

export const aiPlaygroundRuntime = createAiPlaygroundRuntime();
