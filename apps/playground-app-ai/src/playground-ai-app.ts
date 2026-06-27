// file: apps/playground-app-ai/src/playground-ai-app.ts

import { createApp, type GenApp } from "@genspire/core";
import {
  aiExtension,
  type IAiDefaults,
} from "../../../packages/ai/src/extension/ai-extension.js";
import type { IAiProviderClient } from "../../../packages/ai/src/providers/ai-provider-client.js";
import { createMockProviderClient } from "./ai/mock-provider-client.js";

export interface PlaygroundAiAppOptions {
  defaults?: IAiDefaults;
  clients?: IAiProviderClient[];
}

export async function createPlaygroundAiApp(
  options: PlaygroundAiAppOptions = {},
): Promise<GenApp> {
  const app = createApp();

  const clients = options.clients ?? [createMockProviderClient()];
  const firstClientId = clients[0]?.id ?? "mock";
  const defaults: IAiDefaults = options.defaults ?? {
    chatProvider: firstClientId,
    chatModel: "mock-model",
    embeddingProvider: firstClientId,
    embeddingModel: "mock-model",
  };

  await app.use(
    aiExtension({
      clients,
      defaults,
    }),
  );

  return app;
}