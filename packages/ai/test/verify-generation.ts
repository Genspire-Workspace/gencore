import type { IChatGenerationChunk } from "../src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../src/chat/chat-generation-request.js";
import type { IEmbeddingGenerationRequest } from "../src/embeddings/embedding-generation-request.js";
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

const DUMP_CHUNKS = process.env.AI_VERIFY_DUMP_CHUNKS === "true";

function printGenerationHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama (gemma4:12b + embeddinggemma)");
  console.log("  deepseek     - DeepSeek API (deepseek-v4-flash + deepseek-v4-pro)");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai:verify");
  console.log("  bun run dev:ai:verify -- --scenarios ollama");
  console.log("  bun run dev:ai:verify -- --scenario ollama");
  console.log("  bun run dev:ai:verify -- --s ollama");
  console.log("  bun run dev:ai:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST          - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL    - Ollama chat model (default gemma4:12b)");
  console.log("  OLLAMA_EMBED_MODEL   - Ollama embed model (default embeddinggemma:latest)");
  console.log("  DEEPSEEK_API_KEY     - DeepSeek API key (required)");
  console.log("  DEEPSEEK_BASE_URL    - DeepSeek base URL (default https://api.deepseek.com/v1)");
  console.log("  DEEPSEEK_CHAT_MODELS - Comma-separated models (default deepseek-v4-flash,deepseek-v4-pro)");
  console.log("  AI_VERIFY_SCENARIOS  - Comma-separated scenario filter");
  console.log("  AI_VERIFY_DUMP_CHUNKS=true - Dump full chunk JSON to logs");
}

const cliArgs = parseAiVerifyArgs();

if (cliArgs.list) {
  printGenerationHelp();
  process.exit(0);
}

const filter = createScenarioFilter(cliArgs.scenarios);
const logger = createAiVerifyLogger({
  suite: "generation",
  filePrefix: "verify-generation",
});

logger.log(`Log: ${logger.logPath}`);

const scenarios = await createAiVerifyScenarios(logger);
logScenarioHeader(logger, scenarios, filter);

async function runStreamingTest(
  scenario: (typeof scenarios)[number],
  model: string,
  label: string,
  request: IChatGenerationRequest,
  collectReasoning: boolean,
): Promise<void> {
  const req: IChatGenerationRequest = { ...request, model };
  logger.log(`===== [${scenario.name}] [${model}] ${label} =====`);
  logChatOrEmbeddingRequest(logger, req);

  try {
    const chunks: IChatGenerationChunk[] = [];
    const summary = createEmptyChatStreamSummary();

    for await (const chunk of scenario.service.streamChatCompletion(req)) {
      chunks.push(chunk);
      logChatChunk(logger, chunk);
      applyChunkToSummary(summary, chunk, collectReasoning);
    }

    logger.log(`  Chunks received: ${chunks.length}`);
    logChatStreamSummary(logger, summary);
    logger.log(`[${scenario.name}] [${model}] ${label} PASSED.`);

    if (DUMP_CHUNKS) {
      logger.log("");
      logger.log("  --- Stream chunks dump ---");
      for (let index = 0; index < chunks.length; index += 1) {
        logger.log(`  Chunk ${index}: ${JSON.stringify(chunks[index])}`);
      }
    }
  } catch (error) {
    logger.log(
      `  [${scenario.name}] [${model}] ${label} error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.log("");
}

async function runEmbeddingTest(
  scenario: (typeof scenarios)[number],
  model: string,
): Promise<void> {
  logger.log(`===== [${scenario.name}] [${model}] EMBEDDING GENERATION =====`);

  const request: IEmbeddingGenerationRequest = {
    model,
    input: "The quick brown fox jumps over the lazy dog",
  };
  logChatOrEmbeddingRequest(logger, request);

  try {
    const response = await scenario.service.generateEmbedding(request);
    logger.log(`  Embedding count: ${response.embeddings.length}`);
    logger.log(
      `  First embedding dimensions: ${response.embeddings[0]?.embedding.length ?? 0}`,
    );
    if (response.usage) {
      logger.log(
        `  Usage: input=${response.usage.inputTokens}, total=${response.usage.totalTokens}`,
      );
    }
    logger.log(`[${scenario.name}] [${model}] Embedding PASSED.`);
  } catch (error) {
    logger.log(
      `  [${scenario.name}] [${model}] Embedding error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.log("");
}

for (const scenario of scenarios) {
  if (shouldSkipScenario(filter, scenario)) {
    logger.log(
      `SKIP [${scenario.name}]: use --scenarios ${scenario.id} to include.`,
    );
    logger.log("");
    continue;
  }

  logger.log(`========== [${scenario.name}] SCENARIO ==========`);
  logger.log(`  Models: ${scenario.chatModels.join(", ")}`);
  logger.log("");

  for (const model of scenario.chatModels) {
    await runStreamingTest(
      scenario,
      model,
      "WITHOUT REASONING",
      {
        messages: [
          {
            role: "user",
            content: "What is the capital of Portugal? Answer in one word.",
          },
        ],
        settings: { reasoningEffort: "none" },
      },
      false,
    );

    await runStreamingTest(
      scenario,
      model,
      "WITH REASONING",
      {
        messages: [
          {
            role: "user",
            content:
              "If a train leaves Station A at 60 km/h and another leaves Station B at 80 km/h, and the stations are 280 km apart, how long until they meet? Explain step by step.",
          },
        ],
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
    logger.log(`[${scenario.name}] Skipping embedding (not configured).`);
    logger.log("");
  }
}

logger.log("Verification complete.");
await logger.close();
