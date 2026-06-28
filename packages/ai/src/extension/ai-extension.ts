// file: packages/ai/src/extension/ai-extension.ts

import type { GenExtension } from "@genspire/core";
import type { IAiProviderClient } from "../providers/ai-provider-client.js";
import { AiProviderClientRegistry } from "../providers/ai-provider-client-registry.js";
import { AiGenerationService } from "../application/services/ai-generation-service.js";
import { AiSessionDbContext } from "../infrastructure/persistence/ai-session-db-context.js";
import {
  AiAdminGenerationService,
  AiSessionBranchService,
  AiSessionFeedbackService,
  AiSessionGenerationService,
  AiSessionGraphService,
  AiSessionService,
  AiSessionTimelineService,
} from "../application/services/index.js";

export interface IAiDefaults {
  chatProvider?: string;
  chatModel?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
}

export interface IAiExtensionOptions {
  clients: IAiProviderClient[];
  defaults?: IAiDefaults;
}

export function aiExtension(options: IAiExtensionOptions): GenExtension {
  return {
    name: "ai",
    dependsOn: ["data", "data-mikroorm"] as const,
    register(app) {
      const registry = new AiProviderClientRegistry();
      for (const client of options.clients) {
        registry.register(client);
      }

      const service = new AiGenerationService(registry, options.defaults);

      app.provide(AiProviderClientRegistry, registry);
      app.provide(AiGenerationService, service);
      app.registerScoped(AiSessionDbContext);
      app.registerScoped(AiAdminGenerationService);
      app.registerScoped(AiSessionService);
      app.registerScoped(AiSessionTimelineService);
      app.registerScoped(AiSessionGraphService);
      app.registerScoped(AiSessionBranchService);
      app.registerScoped(AiSessionFeedbackService);
      app.registerScoped(AiSessionGenerationService);
    },
  };
}
