import { mkdirSync } from "node:fs";
import path from "node:path";
import { AiClientRegistry } from "../src/clients/ai-client-registry.js";
import { AiContext } from "../src/context/index.js";
import { AiService } from "../src/services/ai-service.js";
import { OpenAICompatibleClient } from "../src/clients/openai-compatible/index.js";
import type { IChatGenerationChunk } from "../src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../src/chat/chat-generation-request.js";
import type { IAiTool } from "../src/tools/ai-tool.js";

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

const getCapitalTool: IAiTool = {
  name: "get_capital",
  description: "Gets the capital city for a country.",
  parameters: {
    type: "object",
    properties: {
      country: {
        type: "string",
        description: "Country name",
      },
    },
    required: ["country"],
  },
  execute: async (args: unknown) => {
    const input = args && typeof args === "object"
      ? (args as { country?: string })
      : {};

    return {
      country: input.country ?? "Portugal",
      capital: "Lisbon",
    };
  },
};

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
  }
}

await writer.end();
log("Verification complete.");
