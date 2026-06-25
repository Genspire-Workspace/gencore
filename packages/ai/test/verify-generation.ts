// file: packages\ai\test\verify-generation.ts

import { mkdirSync } from "node:fs";
import path from "node:path";
import { AiClientRegistry } from "../src/clients/ai-client-registry.js";
import { AiService } from "../src/services/ai-service.js";
import { OpenAICompatibleClient } from "../src/clients/openai-compatible/index.js";
import type { IChatGenerationChunk } from "../src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../src/chat/chat-generation-request.js";
import type { IEmbeddingGenerationRequest } from "../src/embeddings/embedding-generation-request.js";
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
  console.log("  ollama       - Local Ollama (gemma4:12b + embeddinggemma)");
  console.log("  deepseek     - DeepSeek API (deepseek-v4-flash + deepseek-v4-pro)");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai:verify");
  console.log("  bun run dev:ai:verify -- --scenarios ollama");
  console.log("  bun run dev:ai:verify -- --scenarios deepseek,ollama");
  console.log("  bun run dev:ai:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST         - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL   - Ollama chat model (default gemma4:12b)");
  console.log("  OLLAMA_EMBED_MODEL  - Ollama embed model (default embeddinggemma:latest)");
  console.log("  DEEPSEEK_API_KEY    - DeepSeek API key (required)");
  console.log("  DEEPSEEK_BASE_URL   - DeepSeek base URL (default https://api.deepseek.com/v1)");
  console.log("  DEEPSEEK_CHAT_MODELS - Comma-separated models (default deepseek-v4-flash,deepseek-v4-pro)");
  console.log("  AI_VERIFY_SCENARIOS  - Comma-separated scenario filter (alternative to --scenarios)");
  process.exit(0);
}

const SCENARIO_FILTER_ARG = CLI_ARGS.scenarios ?? process.env.AI_VERIFY_SCENARIOS;

// Allow filtering scenarios via CLI --scenarios or AI_VERIFY_SCENARIOS env
const SCENARIO_FILTER = SCENARIO_FILTER_ARG
  ? new Set(
      SCENARIO_FILTER_ARG.split(",")
        .map((s) => s.trim().toLowerCase()),
    )
  : null;

const LOG_DIR = path.resolve(import.meta.dirname, "../../../data/logs/test");
mkdirSync(LOG_DIR, { recursive: true });

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${d.getMilliseconds()}`;
}

const LOG_PATH = path.join(LOG_DIR, `verify-generation-${timestamp()}.log`);
const writer = Bun.file(LOG_PATH).writer();

function log(message: string): void {
  console.log(message);
  writer.write(`${message}\n`);
}

function logRequest(request: IChatGenerationRequest | IEmbeddingGenerationRequest): void {
  log(`  Request:`);
  log(`    model: ${request.model ?? "(default)"}`);
  log(`    provider: ${request.provider ?? "(default)"}`);
  if ("messages" in request) {
    const r = request as IChatGenerationRequest;
    log(`    messages: ${JSON.stringify(r.messages)}`);
    if (r.settings) {
      log(`    settings: ${JSON.stringify(r.settings)}`);
    }
    if (r.tools?.length) {
      log(`    tools: ${r.tools.map((t) => t.name).join(", ")}`);
    }
  } else {
    const r = request as IEmbeddingGenerationRequest;
    log(`    input: ${JSON.stringify(r.input)}`);
    if (r.dimensions) {
      log(`    dimensions: ${r.dimensions}`);
    }
  }
}

function logChunk(chunk: IChatGenerationChunk): void {
  const parts: string[] = [`[chunk]`];
  if (chunk.type) parts.push(`type=${chunk.type}`);
  if (chunk.delta) parts.push(`delta=${JSON.stringify(chunk.delta)}`);
  if (chunk.reasoningDelta) parts.push(`reasoning=${JSON.stringify(chunk.reasoningDelta)}`);
  if (chunk.toolCall) parts.push(`toolCall=${JSON.stringify(chunk.toolCall)}`);
  if (chunk.toolResult) parts.push(`toolResult=${JSON.stringify(chunk.toolResult)}`);
  if (chunk.finishReason) parts.push(`finishReason=${chunk.finishReason}`);
  if (chunk.usage) parts.push(`usage={input:${chunk.usage.inputTokens},output:${chunk.usage.outputTokens},total:${chunk.usage.totalTokens}}`);
  if (chunk.raw) parts.push(`raw=${JSON.stringify(chunk.raw)}`);
  console.log(parts.join(" "));
}

interface Scenario {
  name: string;
  service: AiService;
  chatModels: string[];
  embedModel?: string;
  supportsEmbedding: boolean;
}

const scenarios: Scenario[] = [];

// --- Ollama scenario ---
{
  try {
    const { OllamaClient } = await import("../src/clients/ollama/index.js");
    const ollamaClient = new OllamaClient({
      id: "ollama",
      name: "Ollama",
      host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
    });

    const ollamaRegistry = new AiClientRegistry();
    ollamaRegistry.register(ollamaClient);

    scenarios.push({
      name: "OLLAMA",
      service: new AiService(ollamaRegistry, {
        chatProvider: "ollama",
        embeddingProvider: "ollama",
        embeddingModel: process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
      }),
      chatModels: [process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b"],
      embedModel: process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
      supportsEmbedding: true,
    });
  } catch (error) {
    log(
      `SKIP Ollama: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// --- DeepSeek OpenAI-compatible scenario ---
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

    const deepseekRegistry = new AiClientRegistry();
    deepseekRegistry.register(deepseekClient);

    const models = process.env.DEEPSEEK_CHAT_MODELS
      ? process.env.DEEPSEEK_CHAT_MODELS.split(",")
      : ["deepseek-v4-flash", "deepseek-v4-pro"];

    scenarios.push({
      name: "DEEPSEEK",
      service: new AiService(deepseekRegistry, {
        chatProvider: "deepseek",
        embeddingProvider: "deepseek",
        embeddingModel: process.env.DEEPSEEK_EMBED_MODEL ?? "",
      }),
      chatModels: models,
      embedModel: process.env.DEEPSEEK_EMBED_MODEL || undefined,
      supportsEmbedding: Boolean(process.env.DEEPSEEK_EMBED_MODEL),
    });
  }
}

log(`Log: ${LOG_PATH}`);
log(`Scenarios: ${scenarios.map((s) => s.name).join(", ")}`);
if (SCENARIO_FILTER) {
  log(`Filter: ${[...SCENARIO_FILTER].join(", ")}`);
}
log("");

async function runStreamingTest(
  scenario: Scenario,
  model: string,
  label: string,
  request: IChatGenerationRequest,
  collectReasoning: boolean,
): Promise<void> {
  const req: IChatGenerationRequest = { ...request, model };
  log(`===== [${scenario.name}] [${model}] ${label} =====`);
  logRequest(req);

  try {
    const chunks: IChatGenerationChunk[] = [];
    let fullText = "";
    let fullReasoning = "";
    let toolCallCount = 0;
    let toolResultCount = 0;

    for await (const chunk of scenario.service.streamChatCompletion(req)) {
      chunks.push(chunk);
      logChunk(chunk);

      if (chunk.delta) {
        fullText += chunk.delta;
      }
      if (collectReasoning && chunk.reasoningDelta) {
        fullReasoning += chunk.reasoningDelta;
      }
      if (chunk.toolCall) toolCallCount++;
      if (chunk.toolResult) toolResultCount++;
    }

    log(`  Chunks received: ${chunks.length}`);
    log(`  Full text: ${JSON.stringify(fullText)}`);
    if (collectReasoning && fullReasoning) {
      log(`  Full reasoning: ${JSON.stringify(fullReasoning)}`);
    }
    log(`  Tool calls: ${toolCallCount}`);
    log(`  Tool results: ${toolResultCount}`);
    log(`[${scenario.name}] [${model}] ${label} PASSED.`);

    log("");
    log("  --- Stream chunks dump ---");
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      log(`  Chunk ${i}: ${JSON.stringify(c)}`);
    }
  } catch (error) {
    log(`  [${scenario.name}] [${model}] ${label} error: ${error instanceof Error ? error.message : String(error)}`);
  }
  log("");
}

async function runEmbeddingTest(scenario: Scenario, model: string): Promise<void> {
  log(`===== [${scenario.name}] [${model}] EMBEDDING GENERATION =====`);

  const request: IEmbeddingGenerationRequest = {
    model,
    input: "The quick brown fox jumps over the lazy dog",
  };
  logRequest(request);

  try {
    const response = await scenario.service.generateEmbedding(request);
    log(`  Embedding count: ${response.embeddings.length}`);
    log(`  First embedding dimensions: ${response.embeddings[0]?.embedding.length ?? 0}`);
    if (response.usage) {
      log(`  Usage: input=${response.usage.inputTokens}, total=${response.usage.totalTokens}`);
    }
    log(`  Raw: ${JSON.stringify(response.raw)}`);
    log(`[${scenario.name}] [${model}] Embedding PASSED.`);
  } catch (error) {
    log(`  [${scenario.name}] [${model}] Embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
  log("");
}

for (const scenario of scenarios) {
  if (SCENARIO_FILTER && !SCENARIO_FILTER.has(scenario.name.toLowerCase())) {
    log(`SKIP [${scenario.name}]: use --scenarios ${scenario.name.toLowerCase()} to include.`);
    log("");
    continue;
  }
  log(`========== [${scenario.name}] SCENARIO ==========`);
  log(`  Models: ${scenario.chatModels.join(", ")}`);
  log("");

  for (const model of scenario.chatModels) {
    await runStreamingTest(
      scenario,
      model,
      "WITHOUT REASONING",
      {
        messages: [{ role: "user", content: "What is the capital of Portugal? Answer in one word." }],
        settings: { reasoningEffort: "none" },
      },
      false,
    );

    await runStreamingTest(
      scenario,
      model,
      "WITH REASONING",
      {
        messages: [{ role: "user", content: "If a train leaves Station A at 60 km/h and another leaves Station B at 80 km/h, and the stations are 280 km apart, how long until they meet? Explain step by step." }],
        settings: { reasoningEffort: "high" },
      },
      true,
    );

    await runStreamingTest(
      scenario,
      model,
      "WITH TOOL CALL - CAPITAL",
      {
        messages: [
          {
            role: "user",
            content:
              "Use the get_capital tool to find the capital of Portugal. Then answer with only the capital city name.",
          },
        ],
        tools: [getCapitalTool],
        settings: {
          reasoningEffort: "none",
          toolChoice: "auto",
          maxToolSteps: 3,
        },
      },
      false,
    );

    await runStreamingTest(
      scenario,
      model,
      "WITH TOOL CALL - ADD NUMBERS",
      {
        messages: [
          {
            role: "user",
            content:
              "Use the add_numbers tool to add 123 and 456. Then answer with only the numeric result.",
          },
        ],
        tools: [addNumbersTool],
        settings: {
          reasoningEffort: "none",
          toolChoice: "auto",
          maxToolSteps: 3,
        },
      },
      false,
    );
  }

  if (scenario.supportsEmbedding && scenario.embedModel) {
    await runEmbeddingTest(scenario, scenario.embedModel);
  } else {
    log(`[${scenario.name}] Skipping embedding (not configured).`);
    log("");
  }
}

await writer.end();

log("Verification complete.");
