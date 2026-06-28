// file: packages/ai/src/extension/ai-extension.ts

import type { GenExtension } from "@genspire/core";
import type { IAiProviderClient } from "../providers/ai-provider-client.js";
import { AiProviderClientRegistry } from "../providers/ai-provider-client-registry.js";
import { AiGenerationService } from "../application/services/ai-generation-service.js";
import { AiWorkspaceDbContext } from "../infrastructure/persistence/ai-workspace-db-context.js";
import {
  AiAdminGenerationService,
  AiWorkspaceBranchService,
  AiWorkspaceFeedbackService,
  AiWorkspaceGenerationService,
  AiWorkspaceGraphService,
  AiWorkspaceSessionService,
  AiWorkspaceTimelineService,
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
      app.registerScoped(AiWorkspaceDbContext);
      app.registerScoped(AiAdminGenerationService);
      app.registerScoped(AiWorkspaceSessionService);
      app.registerScoped(AiWorkspaceTimelineService);
      app.registerScoped(AiWorkspaceGraphService);
      app.registerScoped(AiWorkspaceBranchService);
      app.registerScoped(AiWorkspaceFeedbackService);
      app.registerScoped(AiWorkspaceGenerationService);
    },
  };
}
