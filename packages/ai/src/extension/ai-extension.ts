// file: packages\ai\src\extension\ai-extension.ts

import type { GenExtension } from "@genspire/core";
import type { IAiProvider } from "../providers/ai-provider.js";
import { AiProviderRegistry } from "../providers/ai-provider-registry.js";
import { AiService } from "../services/ai-service.js";

export interface IAiDefaults {
  chatProvider?: string;
  chatModel?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
}

export interface IAiExtensionOptions {
  providers: IAiProvider[];
  defaults?: IAiDefaults;
}

export function aiExtension(options: IAiExtensionOptions): GenExtension {
  return {
    name: "ai",
    register(app) {
      const registry = new AiProviderRegistry();
      for (const provider of options.providers) {
        registry.register(provider);
      }

      const service = new AiService(registry, options.defaults);

      app.provide(AiProviderRegistry, registry);
      app.provide(AiService, service);
    },
  };
}
