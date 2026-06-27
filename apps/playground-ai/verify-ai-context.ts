// file: apps\playground-ai\verify-ai-context.ts

import { AiContext } from "../../packages/ai/src/application/context/index.js";
import type { IChatGenerationRequest } from "../../packages/ai/src/domain/chat/chat-generation-request.js";
import type { IAiToolCall } from "../../packages/ai/src/domain/tools/ai-tool-call.js";
import { AiToolCallingManager } from "../../packages/ai/src/application/tools/ai-tool-calling-manager.js";
import { defineAiTool } from "../../packages/ai/src/domain/tools/define-ai-tool.js";
import { AiToolRegistry } from "../../packages/ai/src/application/tools/ai-tool-registry.js";
import { AiToolResolver } from "../../packages/ai/src/application/tools/ai-tool-resolver.js";
import {
  applyChunkToSummary,
  createAiVerifyLogger,
  createAiVerifyScenarios,
  createEmptyChatStreamSummary,
  createScenarioFilter,
  logChatChunk,
  logChatOrEmbeddingRequest,
  logChatStreamSummary,
  logScenarioHeader,
  parseAiVerifyArgs,
  shouldSkipScenario,
} from "./shared/index.js";
import {
  addNumbersTool,
  getCapitalTool,
} from "./tools/test-tools.js";

function printAiContextHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama");
  console.log("  deepseek     - DeepSeek API");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai-context:verify");
  console.log("  bun run dev:ai-context:verify -- --scenarios ollama");
  console.log("  bun run dev:ai-context:verify -- --scenario ollama");
  console.log("  bun run dev:ai-context:verify -- --s ollama");
  console.log("  bun run dev:ai-context:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama");
  console.log("  bun run dev:ai-context:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST          - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL    - Ollama chat model (default gemma4:12b)");
  console.log("  AI_VERIFY_OLLAMA_MODEL - Override Ollama chat model for verification");
  console.log("  DEEPSEEK_API_KEY     - DeepSeek API key (required)");
  console.log("  DEEPSEEK_BASE_URL    - DeepSeek base URL (default https://api.deepseek.com/v1)");
  console.log("  DEEPSEEK_CHAT_MODELS - Comma-separated models (default deepseek-v4-flash,deepseek-v4-pro)");
  console.log("  AI_VERIFY_SCENARIOS  - Comma-separated scenario filter");
}

function assertVerify(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const cliArgs = parseAiVerifyArgs();

if (cliArgs.list) {
  printAiContextHelp();
  process.exit(0);
}

const filter = createScenarioFilter(cliArgs.scenarios);
const logger = createAiVerifyLogger({
  suite: "ai-context",
  filePrefix: "verify-ai-context",
});

logger.log(`Log: ${logger.logPath}`);

const scenarios = await createAiVerifyScenarios(logger, {
  ollamaChatModel: cliArgs.model,
});
logScenarioHeader(logger, scenarios, filter);

const resolvedCapitalOverrideTool = defineAiTool({
  name: "get_capital",
  description: "Gets the capital city for a country and returns an uppercase alias.",
  resultConverter(result: { country: string; capital: string }) {
    return {
      ...result,
      capitalAlias: result.capital.toUpperCase(),
    };
  },
  execute: async (args: unknown) => {
    const input = args && typeof args === "object"
      ? (args as { country?: string })
      : {};
    const country =
      typeof input.country === "string" ? input.country : "Portugal";

    return {
      country,
      capital: "Lisbon",
    };
  },
});

const returnDirectAnswerTool = defineAiTool({
  name: "return_direct_answer",
  description: "Returns a final answer directly for local verification.",
  returnDirect: true,
  execute: async (args: unknown) => {
    const input = args && typeof args === "object"
      ? (args as { answer?: string })
      : {};

    return {
      answer: typeof input.answer === "string" ? input.answer : "OK",
    };
  },
});

function createConversationRequest(model: string): IChatGenerationRequest {
  return new AiContext()
    .setSystemPrompt("You are a precise assistant. Prefer one-sentence answers.")
    .addUserMessage("My favorite city is Lisbon. Reply with only OK.")
    .addAssistantMessage("OK")
    .addUserMessage("What is my favorite city? Answer in one word.")
    .mergeMetadata({
      smokeTest: "ai-context-conversation",
    })
    .toChatGenerationRequest({
      model,
      settings: {
        reasoningEffort: "none",
      },
    });
}

function createToolConversationRequest(model: string): IChatGenerationRequest {
  return new AiContext()
    .setSystemPrompt("You are a helpful assistant.")
    .addUserMessage(
      "Use the get_capital tool to find the capital of Portugal. Then answer with only the capital city name.",
    )
    .addTool(getCapitalTool)
    .mergeMetadata({
      smokeTest: "ai-context-tool-conversation",
    })
    .toChatGenerationRequest({
      model,
      settings: {
        reasoningEffort: "none",
        toolChoice: "auto",
        maxToolSteps: 3,
      },
    });
}

function resolveSmokeTools(): ReturnType<AiToolResolver["resolve"]> {
  const registry = new AiToolRegistry([
    getCapitalTool,
    addNumbersTool,
  ]);

  return new AiToolResolver().resolve({
    toolNames: ["get_capital"],
    tools: [
      resolvedCapitalOverrideTool,
      addNumbersTool,
    ],
    registry,
  });
}

function createResolvedToolConversationRequest(
  model: string,
): IChatGenerationRequest {
  return new AiContext()
    .setSystemPrompt(
      "You are a careful tool-using assistant. Use tools when useful and keep the final answer compact.",
    )
    .addUserMessage(
      "Use add_numbers to add 123 and 456. Then use get_capital for Portugal. Final format: '<sum> | <capital>'.",
    )
    .addTools(resolveSmokeTools())
    .mergeMetadata({
      smokeTest: "ai-context-resolved-tool-conversation",
      mode: "resolver",
    })
    .toChatGenerationRequest({
      model,
      settings: {
        reasoningEffort: "none",
        toolChoice: "auto",
        maxToolSteps: 4,
      },
    });
}

function createComplexConversationRequest(model: string): IChatGenerationRequest {
  return new AiContext()
    .setSystemPrompt(
      "You are a precise assistant. When tools are available, use them and keep the final answer to one short sentence.",
    )
    .addUserMessage("Remember that my trip starts in Portugal.")
    .addAssistantMessage("Understood.")
    .addUserMessage(
      "Use add_numbers to total 7, 11, and 13 by first adding 7 and 11, then using the sum with 13 if needed. Also use get_capital for Portugal. Reply with the city and the total.",
    )
    .addTools(resolveSmokeTools())
    .mergeMetadata({
      smokeTest: "ai-context-complex-tool-conversation",
      mode: "multi-step",
    })
    .toChatGenerationRequest({
      model,
      settings: {
        reasoningEffort: "none",
        toolChoice: "auto",
        maxToolSteps: 5,
      },
    });
}

async function runLocalToolLayerVerification(): Promise<void> {
  logger.log("========== LOCAL TOOL LAYER VERIFICATION ==========");

  const registry = new AiToolRegistry([
    getCapitalTool,
    addNumbersTool,
  ]);
  const resolver = new AiToolResolver();
  const manager = new AiToolCallingManager();

  const resolvedTools = resolver.resolve({
    toolNames: ["get_capital"],
    tools: [
      addNumbersTool,
      resolvedCapitalOverrideTool,
    ],
    registry,
  });

  assertVerify(resolvedTools.length === 2, "Expected exactly two resolved tools.");
  assertVerify(
    resolvedTools.find((tool) => tool.name === "get_capital")?.description ===
      resolvedCapitalOverrideTool.description,
    "Expected direct get_capital override to win over the registry tool.",
  );

  logger.log(`  Resolved tools: ${resolvedTools.map((tool) => tool.name).join(", ")}`);
  logger.log(
    `  Overridden get_capital description: ${resolvedTools.find((tool) => tool.name === "get_capital")?.description ?? "(missing)"}`,
  );

  const toolRun = await manager.run({
    toolCalls: [
      {
        id: "call-1",
        name: "add_numbers",
        arguments: { a: 20, b: 22 },
      },
      {
        id: "call-2",
        name: "get_capital",
        arguments: { country: "Portugal" },
      },
    ] satisfies IAiToolCall[],
    tools: resolvedTools,
    provider: "local",
    model: "local-tool-check",
    metadata: { smokeTest: "local-tool-layer" },
  });

  assertVerify(toolRun.toolResults.length === 2, "Expected two local tool results.");
  assertVerify(
    toolRun.toolResults[0]?.result &&
      typeof toolRun.toolResults[0].result === "object" &&
      "sum" in toolRun.toolResults[0].result &&
      toolRun.toolResults[0].result.sum === 42,
    "Expected add_numbers result sum to equal 42.",
  );
  assertVerify(
    toolRun.toolResults[1]?.result &&
      typeof toolRun.toolResults[1].result === "object" &&
      "capitalAlias" in toolRun.toolResults[1].result &&
      toolRun.toolResults[1].result.capitalAlias === "LISBON",
    "Expected get_capital converted result to include capitalAlias='LISBON'.",
  );

  logger.log(`  Tool results: ${JSON.stringify(toolRun.toolResults)}`);

  const returnDirectRun = await manager.run({
    toolCalls: [
      {
        id: "call-3",
        name: "return_direct_answer",
        arguments: { answer: "DIRECT_OK" },
      },
      {
        id: "call-4",
        name: "add_numbers",
        arguments: { a: 1, b: 2 },
      },
    ] satisfies IAiToolCall[],
    tools: [
      returnDirectAnswerTool,
      addNumbersTool,
    ],
    provider: "local",
    model: "local-tool-check",
    metadata: { smokeTest: "local-return-direct" },
  });

  assertVerify(
    returnDirectRun.toolResults.length === 1,
    "Expected returnDirect to stop before executing the second tool call.",
  );
  assertVerify(
    typeof returnDirectRun.returnDirectResult === "object" &&
      returnDirectRun.returnDirectResult !== null &&
      "answer" in returnDirectRun.returnDirectResult &&
      returnDirectRun.returnDirectResult.answer === "DIRECT_OK",
    "Expected returnDirectResult to equal { answer: 'DIRECT_OK' }.",
  );

  logger.log(`  Return-direct results: ${JSON.stringify(returnDirectRun.toolResults)}`);
  logger.log(`  Return-direct value: ${JSON.stringify(returnDirectRun.returnDirectResult)}`);
  logger.log("");
}

async function runConversationSmokeTest(
  scenario: (typeof scenarios)[number],
  model: string,
  label: string,
  request: IChatGenerationRequest,
): Promise<void> {
  logger.log(`===== [${scenario.name}] [${model}] ${label} =====`);
  logChatOrEmbeddingRequest(logger, request);

  try {
    const summary = createEmptyChatStreamSummary();

    for await (const chunk of scenario.service.streamChat(request)) {
      logChatChunk(logger, chunk);
      applyChunkToSummary(summary, chunk, true);
    }

    logChatStreamSummary(logger, summary);
    logger.log(`[${scenario.name}] [${model}] ${label} PASSED.`);
  } catch (error) {
    logger.log(
      `  [${scenario.name}] [${model}] ${label} error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.log("");
}

await runLocalToolLayerVerification();

for (const scenario of scenarios) {
  if (shouldSkipScenario(filter, scenario)) {
    logger.log(`SKIP [${scenario.name}]: use --scenarios ${scenario.id} to include.`);
    logger.log("");
    continue;
  }

  logger.log(`========== [${scenario.name}] AI CONTEXT SCENARIO ==========`);
  logger.log(`  Models: ${scenario.chatModels.join(", ")}`);
  logger.log("");

  for (const model of scenario.chatModels) {
    await runConversationSmokeTest(
      scenario,
      model,
      "MULTI-TURN CONVERSATION",
      createConversationRequest(model),
    );

    await runConversationSmokeTest(
      scenario,
      model,
      "TOOL CONVERSATION",
      createToolConversationRequest(model),
    );

    await runConversationSmokeTest(
      scenario,
      model,
      "RESOLVED MULTI-TOOL CONVERSATION",
      createResolvedToolConversationRequest(model),
    );

    await runConversationSmokeTest(
      scenario,
      model,
      "COMPLEX MULTI-STEP TOOL CONVERSATION",
      createComplexConversationRequest(model),
    );
  }
}

logger.log("Verification complete.");
await logger.close();
