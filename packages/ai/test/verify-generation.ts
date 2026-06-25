import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  AiClientRegistry,
  AiService,
  OllamaClient,
  OpenAICompatibleClient,
} from "@genspire/ai";
import type {
  IChatGenerationChunk,
  IChatGenerationRequest,
  IEmbeddingGenerationRequest,
} from "@genspire/ai";

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
  if (chunk.delta) parts.push(`delta=${JSON.stringify(chunk.delta)}`);
  if (chunk.reasoningDelta) parts.push(`reasoning=${JSON.stringify(chunk.reasoningDelta)}`);
  if (chunk.finishReason) parts.push(`finishReason=${chunk.finishReason}`);
  if (chunk.usage) parts.push(`usage={input:${chunk.usage.inputTokens},output:${chunk.usage.outputTokens},total:${chunk.usage.totalTokens}}`);
  if (chunk.raw) parts.push(`raw=${JSON.stringify(chunk.raw)}`);
  console.log(parts.join(" "));
}

interface Scenario {
  name: string;
  service: AiService;
  supportsEmbedding: boolean;
}

const scenarios: Scenario[] = [];

// --- Ollama scenario ---
{
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
      chatModel: process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
      embeddingProvider: "ollama",
      embeddingModel: process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
    }),
    supportsEmbedding: true,
  });
}

// --- DeepSeek OpenAI-compatible scenario ---
{
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "sk-9aa09af613654c6e87c942af909bd12c";
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

    scenarios.push({
      name: "DEEPSEEK",
      service: new AiService(deepseekRegistry, {
        chatProvider: "deepseek",
        chatModel: process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-chat",
        embeddingProvider: "deepseek",
        embeddingModel: process.env.DEEPSEEK_EMBED_MODEL ?? "",
      }),
      supportsEmbedding: Boolean(process.env.DEEPSEEK_EMBED_MODEL),
    });
  }
}

log(`Log: ${LOG_PATH}`);
log(`Scenarios: ${scenarios.map((s) => s.name).join(", ")}`);
log("");

async function runStreamingTest(
  scenario: Scenario,
  label: string,
  request: IChatGenerationRequest,
  collectReasoning: boolean,
): Promise<void> {
  log(`===== [${scenario.name}] ${label} =====`);
  logRequest(request);

  try {
    const chunks: IChatGenerationChunk[] = [];
    let fullText = "";
    let fullReasoning = "";

    for await (const chunk of scenario.service.streamChatCompletion(request)) {
      chunks.push(chunk);
      logChunk(chunk);

      if (chunk.delta) {
        fullText += chunk.delta;
      }
      if (collectReasoning && chunk.reasoningDelta) {
        fullReasoning += chunk.reasoningDelta;
      }
    }

    log(`  Chunks received: ${chunks.length}`);
    log(`  Full text: ${JSON.stringify(fullText)}`);
    if (collectReasoning && fullReasoning) {
      log(`  Full reasoning: ${JSON.stringify(fullReasoning)}`);
    }
    log(`[${scenario.name}] ${label} PASSED.`);

    log("");
    log("  --- Stream chunks dump ---");
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      log(`  Chunk ${i}: ${JSON.stringify(c)}`);
    }
  } catch (error) {
    log(`  [${scenario.name}] ${label} error: ${error instanceof Error ? error.message : String(error)}`);
  }
  log("");
}

async function runEmbeddingTest(scenario: Scenario): Promise<void> {
  log(`===== [${scenario.name}] EMBEDDING GENERATION =====`);

  const request: IEmbeddingGenerationRequest = {
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
    log(`[${scenario.name}] Embedding PASSED.`);
  } catch (error) {
    log(`  [${scenario.name}] Embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
  log("");
}

for (const scenario of scenarios) {
  const prefix = `[${scenario.name}]`;
  log(`========== ${prefix} SCENARIO ==========`);
  log("");

  await runStreamingTest(
    scenario,
    "STREAMING WITHOUT REASONING",
    {
      messages: [{ role: "user", content: "What is the capital of Portugal? Answer in one word." }],
    },
    false,
  );

  await runStreamingTest(
    scenario,
    "STREAMING WITH REASONING",
    {
      messages: [{ role: "user", content: "If a train leaves Station A at 60 km/h and another leaves Station B at 80 km/h, and the stations are 280 km apart, how long until they meet? Explain step by step." }],
      settings: { reasoningEffort: "high" },
    },
    true,
  );

  if (scenario.supportsEmbedding) {
    await runEmbeddingTest(scenario);
  } else {
    log(`[${scenario.name}] Skipping embedding (not supported).`);
    log("");
  }
}

await writer.end();

log("Verification complete.");
