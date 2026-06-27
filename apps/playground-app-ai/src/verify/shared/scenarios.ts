// file: apps/playground-app-ai/src/verify/shared/scenarios.ts

import type { IChatGenerationRequest } from "../../../../../packages/ai/src/domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../../../../packages/ai/src/domain/chat/chat-generation-response.js";
import type { IChatGenerationSettings } from "../../../../../packages/ai/src/domain/chat/chat-generation-settings.js";
import type { IChatMessage } from "../../../../../packages/ai/src/domain/chat/chat-message.js";
import type { IEmbeddingGenerationRequest } from "../../../../../packages/ai/src/domain/embeddings/embedding-generation-request.js";
import type { IAiImagePart } from "../../../../../packages/ai/src/domain/messages/ai-content-part.js";
import { Agent } from "../../../../../packages/ai/src/application/agents/agent.js";
import { AiContext } from "../../../../../packages/ai/src/domain/context/ai-context.js";
import { AiGenerationService } from "../../../../../packages/ai/src/application/services/ai-generation-service.js";
import type { IAiAgentLoopResult, IAiAgentStep } from "../../../../../packages/ai/src/application/agents/index.js";
import { defineAiTool } from "../../../../../packages/ai/src/domain/tools/define-ai-tool.js";
import type { IAiToolResult } from "../../../../../packages/ai/src/domain/tools/ai-tool-result.js";
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

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isPlaceholderToolResponseText(value: string): boolean {
  const normalized = normalizeText(value);

  return (
    normalized.length === 0 ||
    normalized === "<|tool_response>" ||
    normalized === "[tool_response]"
  );
}

function logAgentResponse(
  logger: IAppAiLogger,
  response: IChatGenerationResponse,
): void {
  logger.log("  Response:");
  logger.log(`    id: ${response.id}`);
  logger.log(`    provider: ${response.provider ?? "(default)"}`);
  logger.log(`    model: ${response.model ?? "(default)"}`);
  logger.log(`    finishReason: ${response.finishReason ?? "(none)"}`);
  logger.log(
    `    message: ${JSON.stringify({
      role: response.message.role,
      content:
        typeof response.message.content === "string"
          ? response.message.content
          : response.message.content,
    })}`,
  );

  if (response.toolCalls?.length) {
    logger.log(`    toolCalls: ${JSON.stringify(response.toolCalls)}`);
  }

  if (response.toolResults?.length) {
    logger.log(`    toolResults: ${JSON.stringify(response.toolResults)}`);
  }

  if (response.usage) {
    logger.log(
      `    usage: input=${response.usage.inputTokens}, output=${response.usage.outputTokens}, total=${response.usage.totalTokens}`,
    );
  }
}

function logAgentToolResults(
  logger: IAppAiLogger,
  toolResults: readonly IAiToolResult[],
): void {
  if (toolResults.length === 0) {
    logger.log("  Executed tool results: (none)");
    return;
  }

  logger.log(`  Executed tool results: ${toolResults.length}`);

  for (const toolResult of toolResults) {
    logger.log(
      `    [tool_result] ${toolResult.name} call=${toolResult.toolCallId} result=${JSON.stringify(toolResult.result ?? null)} error=${JSON.stringify(toolResult.error ?? null)}`,
    );
  }
}

function logAgentStep(logger: IAppAiLogger, step: IAiAgentStep): void {
  logger.log(`  Step ${step.index + 1}:`);
  logRequest(logger, step.request);
  logAgentResponse(logger, step.response);
  logAgentToolResults(logger, step.toolResults);
  logger.log(`  Step ${step.index + 1} done: ${step.done}`);
}

function logAgentTurnSummary(
  logger: IAppAiLogger,
  result: IAiAgentLoopResult,
): void {
  logger.log("  Agent turn summary:");
  logger.log(`    stopped: ${result.stopped}`);
  logger.log(`    steps: ${result.stepCount}`);
  logger.log(`    toolResults: ${result.toolResults.length}`);
  logger.log(
    `    finalMessage: ${JSON.stringify(extractText(result.finalMessage?.content ?? ""))}`,
  );

  if (result.returnDirectResult !== undefined) {
    logger.log(
      `    returnDirectResult: ${JSON.stringify(result.returnDirectResult)}`,
    );
  }
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
    const summary = createEmptyChatStreamSummary();

    for await (const chunk of options.service.streamChat(request)) {
      applyChunkToSummary(summary, chunk, false);
      options.logger.log(formatChunk(chunk));
    }

    logStreamSummary(options.logger, summary);

    const text = summary.fullText;

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

async function runAgentToolScenario(options: {
  service: AiGenerationService;
  model: string;
  logger: IAppAiLogger;
  label: string;
}): Promise<IScenarioResult> {
  const verificationSecret = "Gencore agent verification secret";
  const context = AiContext.create()
    .setSystemPrompt(
      "You are running an agent verification. You must call the available tool exactly once before answering. Return only the secret from the tool.",
    )
    .addUserMessage(
      "Call the tool and then reply with exactly the secret value that it returns.",
    );
  context.addTool(
    defineAiTool({
      name: "get_verification_secret",
      description:
        "Returns the exact verification secret for the agent verification scenario.",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => ({ secret: verificationSecret }),
    }),
  );

  const agent = new Agent(options.service, context);

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);

  try {
    const result = await agent.run({
      maxSteps: 4,
      requestOverrides: {
        model: options.model,
        settings: { reasoningEffort: "none" },
      },
      onStepStart: (state) => {
        options.logger.log(`  Preparing step ${state.stepCount + 1}`);
      },
      onStepChunk: (chunk) => {
        options.logger.log(formatChunk(chunk));
      },
      onStepEnd: (step) => {
        logAgentStep(options.logger, step);
      },
      onTurnEnd: (result) => {
        logAgentTurnSummary(options.logger, result);
      },
    });

    const finalText = extractText(result.finalMessage?.content ?? "");
    const passed =
      result.stopped === "completed" &&
      result.toolResults.length > 0 &&
      normalizeText(finalText) === normalizeText(verificationSecret);

    options.logger.log(`  Stopped: ${result.stopped}`);
    options.logger.log(`  Tool results: ${result.toolResults.length}`);
    options.logger.log(`  Final message: ${JSON.stringify(finalText)}`);

    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `stopped=${result.stopped}; tools=${result.toolResults.length}; final=${finalText.length} chars`,
      ...(passed
        ? {}
        : {
            error:
              finalText.length > 0
                ? `expected exact secret '${verificationSecret}'`
                : "agent did not produce a final secret message",
          }),
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

async function runAgentVisionScenario(options: {
  service: AiGenerationService;
  model: string;
  image: IAiImagePart;
  logger: IAppAiLogger;
  label: string;
  prompt?: string;
  expected?: string;
}): Promise<IScenarioResult> {
  const prompt =
    options.prompt ??
    "Look at this image and answer with the dominant color in one word.";

  const context = AiContext.create().addUserMessage([
    {
      type: "image",
      data: options.image.data,
      mediaType: options.image.mediaType,
    },
    { type: "text", text: prompt },
  ]);
  const agent = new Agent(options.service, context);

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);

  try {
    const result = await agent.run({
      maxSteps: 1,
      requestOverrides: {
        model: options.model,
        settings: { reasoningEffort: "none" },
      },
      onStepStart: (state) => {
        options.logger.log(`  Preparing step ${state.stepCount + 1}`);
      },
      onStepChunk: (chunk) => {
        options.logger.log(formatChunk(chunk));
      },
      onStepEnd: (step) => {
        logAgentStep(options.logger, step);
      },
      onTurnEnd: (result) => {
        logAgentTurnSummary(options.logger, result);
      },
    });

    const finalText = extractText(result.finalMessage?.content ?? "");
    const expected = options.expected ?? "red";
    const found = normalizeText(finalText).includes(normalizeText(expected));
    const passed = result.stopped === "completed" && finalText.length > 0 && found;

    options.logger.log(`  Stopped: ${result.stopped}`);
    options.logger.log(`  Final message: ${JSON.stringify(finalText)}`);
    options.logger.log(`  Expected keyword '${expected}': ${found ? "found" : "NOT found"}`);

    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `stopped=${result.stopped}; final=${finalText.length} chars; expected=${found ? "found" : "missing"}`,
      ...(passed ? {} : { error: `expected keyword '${expected}' in final agent response` }),
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

async function runAgentMaxTurnsScenario(options: {
  service: AiGenerationService;
  model: string;
  logger: IAppAiLogger;
  label: string;
  maxSteps?: number;
}): Promise<IScenarioResult> {
  const maxSteps = options.maxSteps ?? 2;
  const context = AiContext.create()
    .setSystemPrompt(
      "You are running a max-turn verification. On every turn, call continue_agent_verification. Do not provide a final answer before you are stopped.",
    )
    .addUserMessage(
      "Start the loop verification now. Keep calling the tool and do not finish.",
    );
  context.addTool(
    defineAiTool({
      name: "continue_agent_verification",
      description:
        "Returns instructions telling the model to continue by calling this tool again.",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => ({
        instruction:
          "Continue the loop verification. Do not answer the user yet. Call continue_agent_verification again.",
      }),
    }),
  );

  const agent = new Agent(options.service, context);

  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);

  try {
    const result = await agent.run({
      maxSteps,
      requestOverrides: {
        model: options.model,
        settings: { reasoningEffort: "none" },
      },
      onStepStart: (state) => {
        options.logger.log(`  Preparing step ${state.stepCount + 1}`);
      },
      onStepChunk: (chunk) => {
        options.logger.log(formatChunk(chunk));
      },
      onStepEnd: (step) => {
        const responseText = extractText(step.response.message.content);
        if (step.done && isPlaceholderToolResponseText(responseText)) {
          options.logger.log(
            "  Placeholder tool-response output detected; keeping the loop open for max-turn verification.",
          );
          step.done = false;
        }

        logAgentStep(options.logger, step);
      },
      onMaxStepsFinalMessageStart: (request) => {
        options.logger.log("  Streaming enforced final message after maxSteps:");
        logRequest(options.logger, request);
      },
      onMaxStepsFinalMessageChunk: (chunk) => {
        options.logger.log(formatChunk(chunk));
      },
      onMaxStepsFinalMessageEnd: (message) => {
        options.logger.log(
          `  Streamed final message: ${JSON.stringify(extractText(message?.content ?? ""))}`,
        );
      },
      onTurnEnd: (result) => {
        logAgentTurnSummary(options.logger, result);
      },
    });

    const finalText = extractText(result.finalMessage?.content ?? "");
    const passed =
      result.stopped === "maxSteps" &&
      finalText.length > 0 &&
      !isPlaceholderToolResponseText(finalText);

    options.logger.log(`  Stopped: ${result.stopped}`);
    options.logger.log(`  Tool results: ${result.toolResults.length}`);
    options.logger.log(`  Final message: ${JSON.stringify(finalText)}`);

    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `stopped=${result.stopped}; steps=${result.stepCount}; tools=${result.toolResults.length}; final=${finalText.length} chars`,
      ...(passed
        ? {}
        : { error: "agent did not produce a streamed final message after reaching maxSteps" }),
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

      results.push(
        await runAgentVisionScenario({
          service: config.service,
          model: chatModel,
          image,
          prompt: config.visionPrompt,
          expected: config.visionExpected ?? "red",
          logger,
          label: "AGENT VISION",
        }),
      );
    } else if (!config.skipVision) {
      logger.log(
        `  VISION: skipped (model does not accept image input per ${capabilities.source})`,
      );
    }

    if (capabilities.supportsToolCall) {
      results.push(
        await runAgentToolScenario({
          service: config.service,
          model: chatModel,
          logger,
          label: "AGENT TOOL LOOP",
        }),
      );

      results.push(
        await runAgentMaxTurnsScenario({
          service: config.service,
          model: chatModel,
          logger,
          label: "AGENT MAX TURNS",
        }),
      );
    } else {
      logger.log(
        `  AGENT TOOL LOOP: skipped (model does not support tool calls per ${capabilities.source})`,
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
