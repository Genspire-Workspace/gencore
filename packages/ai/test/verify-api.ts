import {
  createAiVerifyLogger,
  createScenarioFilter,
  fetchJson,
  normalizeBaseUrl,
  parseAiVerifyArgs,
  postJson,
  streamNdjsonOrJson,
  shouldRunScenario,
} from "./shared/index.js";

interface IAiProviderInfo {
  id: string;
  configured: boolean;
}

interface IAiProvidersResponse {
  providers: IAiProviderInfo[];
  defaults: Record<string, unknown>;
}

function printApiHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama API verification");
  console.log("  deepseek     - DeepSeek API verification");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:api:verify");
  console.log("  bun run dev:api:verify -- --base-url http://localhost:3000");
  console.log("  bun run dev:api:verify -- --scenarios ollama");
  console.log("  bun run dev:api:verify -- --scenario ollama");
  console.log("  bun run dev:api:verify -- --s ollama");
  console.log("  bun run dev:api:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  AI_API_BASE_URL     - Base URL for the playground API");
  console.log("  AI_VERIFY_SCENARIOS - Comma-separated scenario filter");
}

const cliArgs = parseAiVerifyArgs();

if (cliArgs.list) {
  printApiHelp();
  process.exit(0);
}

const logger = createAiVerifyLogger({
  suite: "api",
  filePrefix: "verify-api",
});
const filter = createScenarioFilter(cliArgs.scenarios);
const baseUrl = normalizeBaseUrl(
  cliArgs.baseUrl ?? process.env.AI_API_BASE_URL ?? "http://localhost:3000",
);

function isConfiguredProvider(
  providersResponse: IAiProvidersResponse,
  providerId: string,
): boolean {
  return providersResponse.providers.some(
    (provider) => provider.id === providerId && provider.configured,
  );
}

async function runHealthCheck(): Promise<void> {
  logger.log("===== HEALTH =====");
  const response = await fetchJson(`${baseUrl}/health`);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
}

async function runProvidersCheck(): Promise<IAiProvidersResponse> {
  logger.log("===== PROVIDERS =====");
  const response = await fetchJson(`${baseUrl}/ai/providers`);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
  return response.body as IAiProvidersResponse;
}

async function runChatCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);
  const response = await postJson(`${baseUrl}/ai/chat`, payload);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
}

async function runStreamCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);

  const response = await fetch(`${baseUrl}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  logger.log(`  Status: ${response.status}`);
  logger.log(`  Content-Type: ${response.headers.get("content-type") ?? ""}`);

  let chunkCount = 0;
  const collected: unknown[] = [];

  for await (const chunk of streamNdjsonOrJson(response)) {
    chunkCount += 1;
    collected.push(chunk);
    logger.log(`  Chunk ${chunkCount}: ${JSON.stringify(chunk)}`);
  }

  logger.log(`  Chunk Count: ${chunkCount}`);
  logger.log(`  Body: ${JSON.stringify(collected)}`);
  logger.log("");
}

async function runEmbeddingsCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);
  const response = await postJson(`${baseUrl}/ai/embeddings`, payload);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
}

async function runScenario(
  providersResponse: IAiProvidersResponse,
  scenario: "ollama" | "deepseek",
): Promise<void> {
  if (!shouldRunScenario(filter, scenario)) {
    return;
  }

  const configured = isConfiguredProvider(providersResponse, scenario);
  if (!configured && !filter.explicit) {
    logger.log(`SKIP ${scenario}: provider is not configured.`);
    logger.log("");
    return;
  }

  if (!configured) {
    logger.log(
      `SKIP ${scenario}: provider is not configured, but scenario was explicitly requested.`,
    );
    logger.log("");
    return;
  }

  const chatModel =
    scenario === "ollama"
      ? "gemma4:12b"
      : "deepseek-v4-flash";
  const embeddingModel =
    scenario === "ollama"
      ? "embeddinggemma:latest"
      : undefined;

  await runChatCheck(`${scenario.toUpperCase()} CHAT DEFAULTS`, {
    systemPrompt: "You are concise.",
    messages: [
      {
        role: "user",
        content: "What is the capital of Portugal? Answer in one word.",
      },
    ],
    settings: {
      reasoningEffort: "none",
    },
    metadata: {
      smokeTest: `api-chat-default-${scenario}`,
    },
  });

  await runChatCheck(`${scenario.toUpperCase()} CHAT EXPLICIT`, {
    provider: scenario,
    model: chatModel,
    systemPrompt: "You are concise.",
    messages: [
      {
        role: "user",
        content: "What is the capital of Portugal? Answer in one word.",
      },
    ],
    settings: {
      reasoningEffort: "none",
    },
    metadata: {
      smokeTest: `api-chat-explicit-${scenario}`,
    },
  });

  await runStreamCheck(`${scenario.toUpperCase()} CHAT STREAM`, {
    provider: scenario,
    model: chatModel,
    systemPrompt: "You are concise.",
    messages: [
      {
        role: "user",
        content: "What is the capital of Portugal? Answer in one word.",
      },
    ],
    settings: {
      reasoningEffort: "none",
    },
    metadata: {
      smokeTest: `api-chat-stream-${scenario}`,
    },
  });

  if (embeddingModel) {
    await runEmbeddingsCheck(`${scenario.toUpperCase()} EMBEDDINGS DEFAULTS`, {
      input: "The quick brown fox jumps over the lazy dog",
      metadata: {
        smokeTest: `api-embedding-default-${scenario}`,
      },
    });

    await runEmbeddingsCheck(`${scenario.toUpperCase()} EMBEDDINGS EXPLICIT`, {
      provider: scenario,
      model: embeddingModel,
      input: "The quick brown fox jumps over the lazy dog",
      metadata: {
        smokeTest: `api-embedding-explicit-${scenario}`,
      },
    });
  } else {
    logger.log(
      `SKIP ${scenario} embeddings: no explicit embedding model configured for this provider.`,
    );
    logger.log("");
  }
}

logger.log(`Base URL: ${baseUrl}`);
logger.log(`Log: ${logger.logPath}`);
if (filter.values) {
  logger.log(`Filter: ${[...filter.values].join(", ")}`);
}
logger.log("");

await runHealthCheck();
const providersResponse = await runProvidersCheck();
await runScenario(providersResponse, "ollama");
await runScenario(providersResponse, "deepseek");

logger.log("Verification complete.");
await logger.close();
