// file: packages\ai\src\extension\ai-extension.ts

import type { GenExtension } from "@genspire/core";
import type { IAiRuntimeProvider } from "../providers/runtime/ai-runtime-provider.js";
import { AiRuntimeProviderRegistry } from "../providers/runtime/ai-runtime-provider-registry.js";
import { AiService } from "../services/ai-service.js";

export interface IAiDefaults {
  chatEndpoint?: string;
  chatProvider?: string;
  chatModel?: string;
  embeddingEndpoint?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
}

export interface IAiExtensionOptions {
  providers: IAiRuntimeProvider[];
  defaults?: IAiDefaults;
}

export function aiExtension(options: IAiExtensionOptions): GenExtension {
  return {
    name: "ai",
    register(app) {
      const registry = new AiRuntimeProviderRegistry();
      for (const provider of options.providers) {
        registry.register(provider);
      }

      const service = new AiService(registry, options.defaults);

      app.provide(AiRuntimeProviderRegistry, registry);
      app.provide(AiService, service);
    },
  };
}
