import { mkdirSync } from "node:fs";
import path from "node:path";

function parseArgs(): {
  baseUrl?: string;
  list?: boolean;
  scenarios?: string;
} {
  const args = process.argv.slice(2);
  const result: { baseUrl?: string; list?: boolean; scenarios?: string } = {};

  for (let index = 0; index < args.length; index += 1) {
    switch (args[index]) {
      case "--base-url":
      case "-b":
        result.baseUrl = args[index + 1];
        index += 1;
        break;
      case "--scenarios":
      case "-s":
        result.scenarios = args[index + 1];
        index += 1;
        break;
      case "--list":
      case "-l":
        result.list = true;
        break;
    }
  }

  return result;
}

interface IAiProviderInfo {
  id: string;
  configured: boolean;
}

interface IAiProvidersResponse {
  providers: IAiProviderInfo[];
  defaults: Record<string, unknown>;
}

const CLI_ARGS = parseArgs();

if (CLI_ARGS.list) {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama API verification");
  console.log("  deepseek     - DeepSeek API verification");
  console.log("");
  console.log("Usage:");
  console.log("  bun packages/ai/test/verify-api.ts");
  console.log("  bun packages/ai/test/verify-api.ts -- --base-url http://localhost:3000");
  console.log("  bun packages/ai/test/verify-api.ts -- --scenarios ollama");
  console.log("  bun packages/ai/test/verify-api.ts -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  AI_API_BASE_URL     - Base URL for the playground API");
  console.log("  AI_VERIFY_SCENARIOS - Comma-separated scenario filter");
  process.exit(0);
}

const BASE_URL = (CLI_ARGS.baseUrl ?? process.env.AI_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SCENARIO_FILTER_ARG = CLI_ARGS.scenarios ?? process.env.AI_VERIFY_SCENARIOS;
const SCENARIO_FILTER = SCENARIO_FILTER_ARG
  ? new Set(
      SCENARIO_FILTER_ARG.split(",")
        .map((scenario) => scenario.trim().toLowerCase()),
    )
  : null;
const EXPLICIT_SCENARIOS = Boolean(SCENARIO_FILTER);

const LOG_DIR = path.resolve(import.meta.dirname, "../../../data/logs/test");
mkdirSync(LOG_DIR, { recursive: true });

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}

const LOG_PATH = path.join(LOG_DIR, `verify-api-${timestamp()}.log`);
const writer = Bun.file(LOG_PATH).writer();

function log(message: string): void {
  console.log(message);
  writer.write(`${message}\n`);
}

function shouldRunScenario(name: string): boolean {
  return !SCENARIO_FILTER || SCENARIO_FILTER.has(name);
}

function isConfiguredProvider(
  providersResponse: IAiProvidersResponse,
  providerId: string,
): boolean {
  return providersResponse.providers.some(
    (provider) => provider.id === providerId && provider.configured,
  );
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, init);
  const body = await response.json();
  return {
    status: response.status,
    body,
  };
}

async function runHealthCheck(): Promise<void> {
  log("===== HEALTH =====");
  const response = await fetchJson(`${BASE_URL}/health`);
  log(`  Status: ${response.status}`);
  log(`  Body: ${JSON.stringify(response.body)}`);
  log("");
}

async function runProvidersCheck(): Promise<IAiProvidersResponse> {
  log("===== PROVIDERS =====");
  const response = await fetchJson(`${BASE_URL}/ai/providers`);
  log(`  Status: ${response.status}`);
  log(`  Body: ${JSON.stringify(response.body)}`);
  log("");
  return response.body as IAiProvidersResponse;
}

async function runChatCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  log(`===== ${label} =====`);
  log(`  Request: ${JSON.stringify(payload)}`);
  const response = await fetchJson(`${BASE_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  log(`  Status: ${response.status}`);
  log(`  Body: ${JSON.stringify(response.body)}`);
  log("");
}

async function runStreamCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  log(`===== ${label} =====`);
  log(`  Request: ${JSON.stringify(payload)}`);

  const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  log(`  Status: ${response.status}`);
  log(`  Content-Type: ${contentType}`);

  if (contentType.includes("application/x-ndjson")) {
    const text = await response.text();
    const chunks = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    log(`  NDJSON chunks: ${JSON.stringify(chunks)}`);
  } else {
    const body = await response.json();
    log(`  Body: ${JSON.stringify(body)}`);
  }

  log("");
}

async function runEmbeddingsCheck(
  label: string,
  payload: Record<string, unknown>,
): Promise<void> {
  log(`===== ${label} =====`);
  log(`  Request: ${JSON.stringify(payload)}`);
  const response = await fetchJson(`${BASE_URL}/ai/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  log(`  Status: ${response.status}`);
  log(`  Body: ${JSON.stringify(response.body)}`);
  log("");
}

async function runScenario(
  providersResponse: IAiProvidersResponse,
  scenario: "ollama" | "deepseek",
): Promise<void> {
  if (!shouldRunScenario(scenario)) {
    return;
  }

  const configured = isConfiguredProvider(providersResponse, scenario);
  if (!configured && !EXPLICIT_SCENARIOS) {
    log(`SKIP ${scenario}: provider is not configured.`);
    log("");
    return;
  }

  if (!configured) {
    log(`SKIP ${scenario}: provider is not configured, but scenario was explicitly requested.`);
    log("");
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
    log(`SKIP ${scenario} embeddings: no explicit embedding model configured for this provider.`);
    log("");
  }
}

log(`Base URL: ${BASE_URL}`);
log(`Log: ${LOG_PATH}`);
if (SCENARIO_FILTER) {
  log(`Filter: ${[...SCENARIO_FILTER].join(", ")}`);
}
log("");

await runHealthCheck();
const providersResponse = await runProvidersCheck();
await runScenario(providersResponse, "ollama");
await runScenario(providersResponse, "deepseek");

await writer.end();
log("Verification complete.");
