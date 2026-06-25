// file: packages\ai\src\extension\ai-extension.ts

import type { GenExtension } from "@genspire/core";
import type { IAiClient } from "../clients/ai-client.js";
import { AiClientRegistry } from "../clients/ai-client-registry.js";
import { AiService } from "../services/ai-service.js";

export interface IAiDefaults {
  chatProvider?: string;
  chatModel?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
}

export interface IAiExtensionOptions {
  clients: IAiClient[];
  defaults?: IAiDefaults;
}

export function aiExtension(options: IAiExtensionOptions): GenExtension {
  return {
    name: "ai",
    register(app) {
      const registry = new AiClientRegistry();
      for (const client of options.clients) {
        registry.register(client);
      }

      const service = new AiService(registry, options.defaults);

      app.provide(AiClientRegistry, registry);
      app.provide(AiService, service);
    },
  };
}
