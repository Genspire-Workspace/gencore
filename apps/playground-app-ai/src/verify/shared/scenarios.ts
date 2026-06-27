// file: apps/playground-app-ai/src/verify/shared/scenarios.ts

import type { IChatGenerationRequest } from "../../../../../packages/ai/src/domain/chat/chat-generation-request.js";
import type { IChatGenerationSettings } from "../../../../../packages/ai/src/domain/chat/chat-generation-settings.js";
import type { IChatMessage } from "../../../../../packages/ai/src/domain/chat/chat-message.js";
import type { IEmbeddingGenerationRequest } from "../../../../../packages/ai/src/domain/embeddings/embedding-generation-request.js";
import type { IAiImagePart } from "../../../../../packages/ai/src/domain/messages/ai-content-part.js";
import { AiGenerationService } from "../../../../../packages/ai/src/application/services/ai-generation-service.js";
import type { IAiProviderClient } from "../../../../../packages/ai/src/providers/ai-provider-client.js";
import { createPlaygroundAiApp } from "../../playground-ai-app.js";
import {
  createAppAiLogger,
  type IAppAiLogger,
} from "./logger.js";
import {
  applyChunkToSummary,
  createEmptyChatStreamSummary,
  extractText,
  formatChunk,
  logRequest,
  logStreamSummary,
} from "./formatters.js";
import { createDefaultImagePart } from "./images.js";
import {
  formatModelCapabilities,
  resolveModelCapabilities,
  type IDefaultModelCapabilities,
} from "./capabilities.js";
import type { ReasoningEffort } from "./args.js";

export interface IScenarioResult {
  label: string;
  model: string;
  passed: boolean;
  detail: string;
  error?: string;
}

export interface IProviderVerificationResult {
  provider: string;
  providerName: string;
  total: number;
  passed: number;
  failed: number;
  results: IScenarioResult[];
  logPath: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runChatStreamScenario(options: {
  service: AiGenerationService;
  model: string;
  messages: IChatMessage[];
  settings?: IChatGenerationSettings;
  collectReasoning?: boolean;
  logger: IAppAiLogger;
  label: string;
}): Promise<IScenarioResult> {
  const request: IChatGenerationRequest = {
    model: options.model,
    messages: options.messages,
    ...(options.settings ? { settings: options.settings } : {}),
  };

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);

  const summary = createEmptyChatStreamSummary();

  try {
    for await (const chunk of options.service.streamChat(request)) {
      applyChunkToSummary(summary, chunk, options.collectReasoning);
      options.logger.log(formatChunk(chunk));
    }

    logStreamSummary(options.logger, summary);

    const passed = summary.fullText.trim().length > 0;

    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `text=${summary.fullText.length} chars; reasoning=${summary.fullReasoning.length} chars; finish=${summary.finishCount}; empty=${summary.emptyChunkCount}`,
    };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);

    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message,
    };
  }
}

async function runVisionScenario(options: {
  service: AiGenerationService;
  model: string;
  image: IAiImagePart;
  prompt?: string;
  expected?: string;
  logger: IAppAiLogger;
  label: string;
}): Promise<IScenarioResult> {
  const prompt =
    options.prompt ??
    "What is the dominant color of this image? Answer with a single word.";

  const request: IChatGenerationRequest = {
    model: options.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", data: options.image.data, mediaType: options.image.mediaType },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);

  try {
    const response = await options.service.generateChat(request);
    const text = extractText(response.message.content);

    options.logger.log(`  Response: ${text}`);

    const passed = text.trim().length > 0;
    let detail = `text=${text.length} chars`;

    if (options.expected) {
      const found = text.toLowerCase().includes(options.expected.toLowerCase());
      options.logger.log(
        `  Expected keyword '${options.expected}': ${found ? "found" : "NOT found"}`,
      );
      detail += `; expected=${found ? "found" : "missing"}`;
    }

    return { label: options.label, model: options.model, passed, detail };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);

    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message,
    };
  }
}

async function runEmbeddingScenario(options: {
  service: AiGenerationService;
  model: string;
  input: string;
  logger: IAppAiLogger;
  label: string;
}): Promise<IScenarioResult> {
  const request: IEmbeddingGenerationRequest = {
    model: options.model,
    input: options.input,
  };

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);

  try {
    const response = await options.service.generateEmbedding(request);
    const count = response.embeddings.length;
    const dimensions = response.embeddings[0]?.embedding.length ?? 0;

    options.logger.log(`  Embeddings: ${count}; dimensions: ${dimensions}`);

    if (response.usage) {
      options.logger.log(
        `  Usage: input=${response.usage.inputTokens}, total=${response.usage.totalTokens}`,
      );
    }

    const passed = count > 0 && dimensions > 0;

    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `embeddings=${count}; dims=${dimensions}`,
    };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);

    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message,
    };
  }
}

export interface IVerifyProviderConfig {
  provider: string;
  providerName: string;
  service: AiGenerationService;
  chatModels: string[];
  embedModel?: string;
  supportsEmbedding: boolean;
  defaultModelCapabilities?: IDefaultModelCapabilities;
  skipVision?: boolean;
  image?: IAiImagePart;
  visionPrompt?: string;
  visionExpected?: string;
  reasoningEffort?: ReasoningEffort;
  logger: IAppAiLogger;
}

export async function verifyProvider(
  config: IVerifyProviderConfig,
): Promise<IProviderVerificationResult> {
  const logger = config.logger;
  const image = config.image ?? createDefaultImagePart();

  logger.log(`========== Provider: ${config.providerName} ==========`);
  logger.log(`Chat models: ${config.chatModels.join(", ") || "(none)"}`);

  if (config.supportsEmbedding && config.embedModel) {
    logger.log(`Embedding model: ${config.embedModel}`);
  } else {
    logger.log("Embedding model: (none)");
  }

  const results: IScenarioResult[] = [];

  for (const chatModel of config.chatModels) {
    const capabilities = resolveModelCapabilities(
      chatModel,
      config.defaultModelCapabilities,
    );

    logger.log("");
    logger.log(
      `  Capabilities [${chatModel}]: ${formatModelCapabilities(capabilities)}`,
    );

    results.push(
      await runChatStreamScenario({
        service: config.service,
        model: chatModel,
        logger,
        label: "CHAT STREAM (no reasoning)",
        messages: [
          {
            role: "user",
            content: "What is the capital of Portugal? Answer in one word.",
          },
        ],
        settings: { reasoningEffort: "none" },
      }),
    );

    results.push(
      await runChatStreamScenario({
        service: config.service,
        model: chatModel,
        logger,
        label: "CHAT STREAM (with reasoning)",
        messages: [
          {
            role: "user",
            content:
              "A train leaves station A at 60 km/h and another leaves station B at 80 km/h. The stations are 280 km apart. How long until they meet? Explain step by step.",
          },
        ],
        settings: { reasoningEffort: config.reasoningEffort ?? "high" },
        collectReasoning: true,
      }),
    );

    if (!config.skipVision && capabilities.supportsImage) {
      results.push(
        await runVisionScenario({
          service: config.service,
          model: chatModel,
          image,
          prompt: config.visionPrompt,
          expected: config.visionExpected ?? "red",
          logger,
          label: "VISION (image+text parts)",
        }),
      );
    } else if (!config.skipVision) {
      logger.log(
        `  VISION: skipped (model does not accept image input per ${capabilities.source})`,
      );
    }
  }

  if (config.supportsEmbedding && config.embedModel) {
    results.push(
      await runEmbeddingScenario({
        service: config.service,
        model: config.embedModel,
        input: "The quick brown fox jumps over the lazy dog",
        logger,
        label: "EMBEDDING",
      }),
    );
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  logger.log("");
  logger.log(
    `Provider '${config.providerName}' summary: ${results.length} scenarios, ${passed} passed, ${failed} failed.`,
  );

  for (const result of results) {
    logger.log(
      `  [${result.passed ? "PASS" : "FAIL"}] ${result.label} [${result.model}] - ${result.detail}${result.error ? ` :: ${result.error}` : ""}`,
    );
  }

  return {
    provider: config.provider,
    providerName: config.providerName,
    total: results.length,
    passed,
    failed,
    results,
    logPath: logger.logPath,
  };
}

export interface IRunProviderVerificationOptions {
  provider: string;
  providerName: string;
  client: IAiProviderClient;
  chatModels: string[];
  embedModel?: string;
  supportsEmbedding: boolean;
  defaultModelCapabilities?: IDefaultModelCapabilities;
  skipVision?: boolean;
  reasoningEffort?: ReasoningEffort;
  image?: IAiImagePart;
  visionPrompt?: string;
  visionExpected?: string;
  filePrefix?: string;
}

export async function runProviderVerification(
  options: IRunProviderVerificationOptions,
): Promise<IProviderVerificationResult> {
  const app = await createPlaygroundAiApp({
    clients: [options.client],
    defaults: {
      chatProvider: options.client.id,
      chatModel: options.chatModels[0],
      embeddingProvider: options.client.id,
      embeddingModel: options.embedModel,
    },
  });

  await app.start();

  const service = app.get(AiGenerationService);
  const logger = createAppAiLogger({
    provider: options.provider,
    filePrefix: options.filePrefix ?? `verification-${options.provider}`,
  });

  try {
    const result = await verifyProvider({
      provider: options.provider,
      providerName: options.providerName,
      service,
      chatModels: options.chatModels,
      embedModel: options.embedModel,
      supportsEmbedding: options.supportsEmbedding,
      defaultModelCapabilities: options.defaultModelCapabilities,
      skipVision: options.skipVision,
      reasoningEffort: options.reasoningEffort,
      image: options.image,
      visionPrompt: options.visionPrompt,
      visionExpected: options.visionExpected,
      logger,
    });

    if (result.failed > 0) {
      process.exitCode = 1;
    }

    return result;
  } finally {
    await logger.close();
    await app.stop();
  }
}