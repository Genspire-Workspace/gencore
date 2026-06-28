// file: apps/playground-app-ai/src/index.ts

import { AiGenerationService } from "../../../packages/ai/src/application/services/generation/ai-generation-service.js";
import { createPlaygroundAiApp } from "./playground-ai-app.js";
import { createAiAppProvidersFromEnv } from "./ai/providers.js";
import { createAppAiLogger, createLocalImagePart, verifyProvider } from "./verify/shared/index.js";

const providers = createAiAppProvidersFromEnv();

if (providers.length === 0) {
  console.log(
    "No AI providers configured. Set OLLAMA_API_KEY and/or DEEPSEEK_API_KEY in .env, or set AI_APP_PROVIDER to a valid id.",
  );
  process.exit(0);
}

let failedProviders = 0;

for (const config of providers) {
  const app = await createPlaygroundAiApp({
    clients: [config.client],
    defaults: {
      chatProvider: config.client.id,
      chatModel: config.chatModel,
      embeddingProvider: config.client.id,
      embeddingModel: config.embeddingModel,
    },
  });

  await app.start();

  const image = config.imagePath
    ? await createLocalImagePart(config.imagePath).catch(() => undefined)
    : undefined;

  const logger = createAppAiLogger({
    provider: config.client.id,
    filePrefix: `verification-${config.client.id}`,
  });

  try {
    const result = await verifyProvider({
      provider: config.client.id,
      providerName: config.client.name,
      service: app.get(AiGenerationService),
      chatModels: config.chatModels,
      embedModel: config.embeddingModel,
      supportsEmbedding: config.supportsEmbedding,
      defaultModelCapabilities: config.defaultModelCapabilities,
      image,
      visionPrompt: config.visionPrompt,
      visionExpected: config.visionExpected,
      logger,
    });

    if (result.failed > 0) {
      failedProviders += 1;
    }
  } finally {
    await logger.close();
    await app.stop();
  }
}

if (failedProviders > 0) {
  process.exit(1);
}