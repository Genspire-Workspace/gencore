import { mkdirSync } from "node:fs";
import path from "node:path";
import { AiClientRegistry } from "../src/clients/ai-client-registry.js";
import { AiContext } from "../src/context/index.js";
import { AiService } from "../src/services/ai-service.js";
import { OpenAICompatibleClient } from "../src/clients/openai-compatible/index.js";
import type { IChatGenerationChunk } from "../src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../src/chat/chat-generation-request.js";
import type { IAiToolCall } from "../src/tools/ai-tool-call.js";
import { AiToolCallingManager } from "../src/tools/ai-tool-calling-manager.js";
import { defineAiTool } from "../src/tools/define-ai-tool.js";
import { AiToolRegistry } from "../src/tools/ai-tool-registry.js";
import { AiToolResolver } from "../src/tools/ai-tool-resolver.js";
import {
  addNumbersTool,
  getCapitalTool,
} from "./tools/test-tools.js";

function parseArgs(): { list?: boolean; scenarios?: string } {
  const args = process.argv.slice(2);
  const result: { list?: boolean; scenarios?: string } = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--list":
      case "-l":
        result.list = true;
        break;
      case "--scenarios":
      case "-s":
        result.scenarios = args[++i];
        break;
    }
  }

  return result;
}

const CLI_ARGS = parseArgs();

if (CLI_ARGS.list) {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama");
  console.log("  deepseek     - DeepSeek API");
  console.log("");
  console.log("Usage:");
  console.log("  bun packages/ai/test/verify-ai-context.ts");
  console.log("  bun packages/ai/test/verify-ai-context.ts -- --scenarios ollama");
  console.log("  bun packages/ai/test/verify-ai-context.ts -- --scenarios deepseek,ollama");
  console.log("  bun packages/ai/test/verify-ai-context.ts -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST         - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL   - Ollama chat model (default gemma4:12b)");
  console.log("  DEEPSEEK_API_KEY    - DeepSeek API key (required)");
  console.log("  DEEPSEEK_BASE_URL   - DeepSeek base URL (default https://api.deepseek.com/v1)");
  console.log("  DEEPSEEK_CHAT_MODELS - Comma-separated models (default deepseek-v4-flash,deepseek-v4-pro)");
  console.log("  AI_VERIFY_SCENARIOS - Comma-separated scenario filter (alternative to --scenarios)");
  process.exit(0);
}

const SCENARIO_FILTER_ARG = CLI_ARGS.scenarios ?? process.env.AI_VERIFY_SCENARIOS;
const SCENARIO_FILTER = SCENARIO_FILTER_ARG
  ? new Set(
      SCENARIO_FILTER_ARG.split(",")
        .map((scenario) => scenario.trim().toLowerCase()),
    )
  : null;

const LOG_DIR = path.resolve(import.meta.dirname, "../../../data/logs/test");
mkdirSync(LOG_DIR, { recursive: true });

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}

const LOG_PATH = path.join(LOG_DIR, `verify-ai-context-${timestamp()}.log`);
const writer = Bun.file(LOG_PATH).writer();

function log(message: string): void {
  console.log(message);
  writer.write(`${message}\n`);
}

function logRequest(request: IChatGenerationRequest): void {
  log("  Request:");
  log(`    model: ${request.model ?? "(default)"}`);
  log(`    provider: ${request.provider ?? "(default)"}`);
  log(`    messages: ${JSON.stringify(request.messages)}`);
  if (request.settings) {
    log(`    settings: ${JSON.stringify(request.settings)}`);
  }
  if (request.tools?.length) {
    log(`    tools: ${request.tools.map((tool) => tool.name).join(", ")}`);
  }
  if (request.metadata) {
    log(`    metadata: ${JSON.stringify(request.metadata)}`);
  }
}

function logChunk(chunk: IChatGenerationChunk): void {
  const parts: string[] = ["[chunk]"];
  if (chunk.type) parts.push(`type=${chunk.type}`);
  if (chunk.delta) parts.push(`delta=${JSON.stringify(chunk.delta)}`);
  if (chunk.reasoningDelta) {
    parts.push(`reasoning=${JSON.stringify(chunk.reasoningDelta)}`);
  }
  if (chunk.toolCall) parts.push(`toolCall=${JSON.stringify(chunk.toolCall)}`);
  if (chunk.toolResult) {
    parts.push(`toolResult=${JSON.stringify(chunk.toolResult)}`);
  }
  if (chunk.finishReason) parts.push(`finishReason=${chunk.finishReason}`);
  console.log(parts.join(" "));
}

interface IScenario {
  name: string;
  service: AiService;
  chatModels: string[];
}

const resolvedCapitalOverrideTool = defineAiTool({
  name: "get_capital",
  description: "Gets the capital city for a country and returns an uppercase alias.",
  resultConverter: (result: { country: string; capital: string }) => ({
    ...result,
    capitalAlias: result.capital.toUpperCase(),
  }),
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

const scenarios: IScenario[] = [];

{
  try {
    const { OllamaClient } = await import("../src/clients/ollama/index.js");
    const ollamaClient = new OllamaClient({
      id: "ollama",
      name: "Ollama",
      host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
    });

    const registry = new AiClientRegistry();
    registry.register(ollamaClient);

    scenarios.push({
      name: "OLLAMA",
      service: new AiService(registry, {
        chatProvider: "ollama",
      }),
      chatModels: [process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b"],
    });
  } catch (error) {
    log(
      `SKIP Ollama: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

{
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApiKey) {
    log("SKIP DeepSeek: DEEPSEEK_API_KEY not set.");
  } else {
    const deepseekClient = new OpenAICompatibleClient({
      id: "deepseek",
      name: "DeepSeek",
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
      apiKey: deepseekApiKey,
    });

    const registry = new AiClientRegistry();
    registry.register(deepseekClient);

    scenarios.push({
      name: "DEEPSEEK",
      service: new AiService(registry, {
        chatProvider: "deepseek",
      }),
      chatModels: process.env.DEEPSEEK_CHAT_MODELS
        ? process.env.DEEPSEEK_CHAT_MODELS.split(",")
        : ["deepseek-v4-flash", "deepseek-v4-pro"],
    });
  }
}

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
  log("========== LOCAL TOOL LAYER VERIFICATION ==========");

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

  log(`  Resolved tools: ${resolvedTools.map((tool) => tool.name).join(", ")}`);
  log(
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

  log(`  Tool results: ${JSON.stringify(toolRun.toolResults)}`);

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

  log(`  Return-direct results: ${JSON.stringify(returnDirectRun.toolResults)}`);
  log(`  Return-direct value: ${JSON.stringify(returnDirectRun.returnDirectResult)}`);
  log("");
}

async function runConversationSmokeTest(
  scenario: IScenario,
  model: string,
  label: string,
  request: IChatGenerationRequest,
): Promise<void> {
  log(`===== [${scenario.name}] [${model}] ${label} =====`);
  logRequest(request);

  try {
    let fullText = "";
    let toolCallCount = 0;
    let toolResultCount = 0;

    for await (const chunk of scenario.service.streamChatCompletion(request)) {
      logChunk(chunk);

      if (chunk.delta) {
        fullText += chunk.delta;
      }
      if (chunk.toolCall) {
        toolCallCount++;
      }
      if (chunk.toolResult) {
        toolResultCount++;
      }
    }

    log(`  Full text: ${JSON.stringify(fullText)}`);
    log(`  Tool calls: ${toolCallCount}`);
    log(`  Tool results: ${toolResultCount}`);
    log(`[${scenario.name}] [${model}] ${label} PASSED.`);
  } catch (error) {
    log(
      `  [${scenario.name}] [${model}] ${label} error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  log("");
}

log(`Log: ${LOG_PATH}`);
log(`Scenarios: ${scenarios.map((scenario) => scenario.name).join(", ")}`);
if (SCENARIO_FILTER) {
  log(`Filter: ${[...SCENARIO_FILTER].join(", ")}`);
}
log("");

await runLocalToolLayerVerification();

for (const scenario of scenarios) {
  if (SCENARIO_FILTER && !SCENARIO_FILTER.has(scenario.name.toLowerCase())) {
    log(`SKIP [${scenario.name}]: use --scenarios ${scenario.name.toLowerCase()} to include.`);
    log("");
    continue;
  }

  log(`========== [${scenario.name}] AI CONTEXT SCENARIO ==========`);
  log(`  Models: ${scenario.chatModels.join(", ")}`);
  log("");

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

await writer.end();
log("Verification complete.");
