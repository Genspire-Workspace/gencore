// file: apps\playground-ai\verify-api.ts

import {
  appendToolInteractionMessages,
  collectApiStream,
  createAiVerifyLogger,
  createScenarioFilter,
  createDeclarativeToolDto,
  createToolResultMessages,
  executeSmokeClientToolCalls,
  fetchJson,
  fetchWithTimeout,
  normalizeBaseUrl,
  parseAiVerifyArgs,
  postJson,
  streamNdjsonOrJson,
  type IAiApiChatMessageDto,
  shouldRunScenario,
} from "./shared/index.js";
import {
  addNumbersTool,
  getCapitalTool,
  waitThenAddNumbersTool,
} from "./tools/test-tools.js";

interface IAiProviderInfo {
  id: string;
  configured: boolean;
}

interface IAiProvidersResponse {
  providers: IAiProviderInfo[];
  defaults: Record<string, unknown>;
}

interface IAiApiChatRequestPayload {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  messages: IAiApiChatMessageDto[];
  tools?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    executionMode?: "client" | "server";
  }>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface IPostedApiStream {
  status: number;
  contentType: string;
  chunks: unknown[];
  timings: {
    startedAt: number;
    firstChunkAt?: number;
    completedAt: number;
    chunkTimings: Array<{
      index: number;
      at: number;
      elapsedMs: number;
      type?: string;
    }>;
  };
}

const MAX_TOOL_ROUNDS = 5;
const TOOL_DELAY_CLAMP_MIN_MS = 0;
const TOOL_DELAY_CLAMP_MAX_MS = 10_000;
const TOOL_DELAY_MIN_MS = readNumberEnv("AI_VERIFY_TOOL_DELAY_MIN_MS", 250);
const TOOL_DELAY_MAX_MS = readNumberEnv("AI_VERIFY_TOOL_DELAY_MAX_MS", 1500);
const TOOL_DELAY_ROUNDS = Math.max(
  1,
  Math.floor(readNumberEnv("AI_VERIFY_TOOL_DELAY_ROUNDS", 3)),
);
const STREAM_HEARTBEAT_INTERVAL_MS = readNumberEnv(
  "AI_STREAM_HEARTBEAT_INTERVAL_MS",
  1000,
);
const HTTP_TIMEOUT_MS = Math.max(
  readNumberEnv("AI_VERIFY_HTTP_TIMEOUT_MS", 30_000),
  TOOL_DELAY_MAX_MS * 4,
);

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
  console.log("  bun run dev:api:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama");
  console.log("  bun run dev:api:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  AI_API_BASE_URL           - Base URL for the playground API");
  console.log("  AI_VERIFY_SCENARIOS       - Comma-separated scenario filter");
  console.log("  AI_VERIFY_OLLAMA_MODEL    - Override Ollama chat model for API verification");
  console.log("  AI_VERIFY_TOOL_DELAY_MIN_MS - Minimum delay for delayed tool checks");
  console.log("  AI_VERIFY_TOOL_DELAY_MAX_MS - Maximum delay for delayed tool checks");
  console.log("  AI_VERIFY_TOOL_DELAY_ROUNDS - Number of delayed tool rounds");
  console.log("  AI_VERIFY_HTTP_TIMEOUT_MS - Verifier HTTP timeout");
  console.log("  AI_STREAM_HEARTBEAT_INTERVAL_MS - API stream heartbeat interval");
}

function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampToolDelayMs(delayMs: number): number {
  return Math.min(
    TOOL_DELAY_CLAMP_MAX_MS,
    Math.max(TOOL_DELAY_CLAMP_MIN_MS, Math.floor(delayMs)),
  );
}

function resolveOllamaChatModel(): string {
  return (
    cliArgs.model?.trim() ||
    process.env.AI_VERIFY_OLLAMA_MODEL?.trim() ||
    process.env.OLLAMA_CHAT_MODEL?.trim() ||
    "gemma4:12b"
  );
}

function assertVerify(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isConfiguredProvider(
  providersResponse: IAiProvidersResponse,
  providerId: string,
): boolean {
  return providersResponse.providers.some(
    (provider) => provider.id === providerId && provider.configured,
  );
}

function readElapsedMs(startedAt: number, endedAt: number): number {
  return endedAt - startedAt;
}

function readDelayMsFromResultValue(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || !("delayMs" in value)) {
    return undefined;
  }

  return typeof value.delayMs === "number" && Number.isFinite(value.delayMs)
    ? value.delayMs
    : undefined;
}

function readDelayMsFromClientToolResult(
  toolResults: readonly {
    name?: string;
    result?: unknown;
  }[],
  toolName: string,
): number | undefined {
  const toolResult = toolResults.find((result) => result.name === toolName);

  return toolResult ? readDelayMsFromResultValue(toolResult.result) : undefined;
}

function readDelayMsFromServerToolResult(
  toolResult: {
    result?: unknown;
  } | undefined,
): number | undefined {
  return toolResult ? readDelayMsFromResultValue(toolResult.result) : undefined;
}

function findFirstChunkElapsedByType(
  stream: IPostedApiStream,
  type: string,
): number | undefined {
  return stream.timings.chunkTimings.find((timing) => timing.type === type)?.elapsedMs;
}

function findOwnedToolResult(
  collected: ReturnType<typeof collectApiStream>,
  toolName: string,
) {
  return collected.toolResults.find((toolResult) => toolResult.name === toolName);
}

function createWaitThenGetCapitalToolDto(): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  executionMode: "server";
} {
  return {
    name: "wait_then_get_capital",
    description:
      "Waits for the requested duration, then returns the capital city for a country.",
    parameters: {
      type: "object",
      properties: {
        country: {
          type: "string",
        },
        delayMs: {
          type: "number",
        },
      },
      required: ["country"],
    },
    executionMode: "server",
  };
}

function createChatRequestPayload(
  scenario: "ollama" | "deepseek",
  model: string,
  prompt: string,
  tools: IAiApiChatRequestPayload["tools"],
  smokeTest: string,
  messages?: IAiApiChatMessageDto[],
): IAiApiChatRequestPayload {
  return {
    provider: scenario,
    model,
    systemPrompt: "You are concise and must use tools when instructed.",
    messages:
      messages ??
      [
        {
          role: "user",
          content: prompt,
        },
      ],
    tools,
    settings: {
      reasoningEffort: "none",
      toolChoice: "auto",
      maxToolSteps: 5,
    },
    metadata: {
      smokeTest,
    },
  };
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

async function runHealthCheck(): Promise<void> {
  logger.log("===== HEALTH =====");
  const response = await fetchJson(`${baseUrl}/health`, undefined, HTTP_TIMEOUT_MS);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
}

async function runProvidersCheck(): Promise<IAiProvidersResponse> {
  logger.log("===== PROVIDERS =====");
  const response = await fetchJson(
    `${baseUrl}/ai/providers`,
    undefined,
    HTTP_TIMEOUT_MS,
  );
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");
  return response.body as IAiProvidersResponse;
}

async function runChatCheck(
  label: string,
  payload: unknown,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);
  const response = await postJson(`${baseUrl}/ai/chat`, payload, HTTP_TIMEOUT_MS);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  assertVerify(response.status === 200, `${label} expected HTTP 200.`);
  logger.log("");
}

async function postStreamAndCollect(
  label: string,
  payload: unknown,
): Promise<IPostedApiStream> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    `${baseUrl}/ai/chat/stream`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    HTTP_TIMEOUT_MS,
  );

  logger.log(`  Status: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  logger.log(`  Content-Type: ${contentType}`);

  let chunkCount = 0;
  const collected: unknown[] = [];
  const chunkTimings: IPostedApiStream["timings"]["chunkTimings"] = [];
  let firstChunkAt: number | undefined;

  for await (const chunk of streamNdjsonOrJson(response)) {
    const at = Date.now();
    chunkCount += 1;
    collected.push(chunk);

    if (!firstChunkAt) {
      firstChunkAt = at;
    }

    const type =
      chunk &&
        typeof chunk === "object" &&
        "type" in chunk &&
        typeof chunk.type === "string"
        ? chunk.type
        : undefined;

    chunkTimings.push({
      index: chunkCount,
      at,
      elapsedMs: at - startedAt,
      type,
    });

    logger.log(`  Chunk ${chunkCount} (+${at - startedAt}ms): ${JSON.stringify(chunk)}`);
  }

  const completedAt = Date.now();

  logger.log(`  Chunk Count: ${chunkCount}`);
  logger.log(`  Stream startedAt: ${startedAt}`);
  logger.log(`  Stream firstChunkAt: ${firstChunkAt ?? "(none)"}`);
  logger.log(`  Stream completedAt: ${completedAt}`);
  logger.log(`  Stream elapsedMs: ${completedAt - startedAt}`);
  logger.log(`  Body: ${JSON.stringify(collected)}`);
  logger.log("");

  return {
    status: response.status,
    contentType,
    chunks: collected,
    timings: {
      startedAt,
      firstChunkAt,
      completedAt,
      chunkTimings,
    },
  };
}

async function runStreamCheck(
  label: string,
  payload: unknown,
): Promise<void> {
  const result = await postStreamAndCollect(label, payload);
  assertVerify(result.status === 200, `${label} expected HTTP 200.`);
}

async function runEmbeddingsCheck(
  label: string,
  payload: unknown,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);
  const response = await postJson(
    `${baseUrl}/ai/embeddings`,
    payload,
    HTTP_TIMEOUT_MS,
  );
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  assertVerify(response.status === 200, `${label} expected HTTP 200.`);
  logger.log("");
}

async function runClientToolConversation(
  label: string,
  payload: IAiApiChatRequestPayload,
  expectedText: string,
  expectedClientToolName: string,
  localTools = [
    addNumbersTool,
    getCapitalTool,
    waitThenAddNumbersTool,
  ],
): Promise<void> {
  let messages = [...payload.messages];

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
    const roundPayload: IAiApiChatRequestPayload = {
      ...payload,
      messages,
      metadata: {
        ...(payload.metadata ?? {}),
        round,
      },
    };

    const streamResponse = await postStreamAndCollect(
      `${label} ROUND ${round}`,
      roundPayload,
    );

    assertVerify(
      streamResponse.status === 200,
      `${label} round ${round} expected HTTP 200.`,
    );

    const collected = collectApiStream(streamResponse.chunks);
    logger.log(`  Detected tool calls: ${JSON.stringify(collected.toolCalls)}`);
    logger.log(`  Detected tool results: ${JSON.stringify(collected.toolResults)}`);
    logger.log(`  Detected text: ${JSON.stringify(collected.text)}`);

    const clientToolCalls = collected.toolCalls.filter(
      (toolCall) => toolCall.name === expectedClientToolName,
    );
    const serverExecutedClientResults = collected.toolResults.filter(
      (toolResult) => toolResult.name === expectedClientToolName,
    );

    for (const toolCall of clientToolCalls) {
      assertVerify(
        toolCall.executionMode === "client",
        `${label} expected client tool call '${toolCall.name}' to be marked executionMode='client'.`,
      );
    }

    assertVerify(
      serverExecutedClientResults.length === 0,
      `${label} unexpectedly had the server execute client tool '${expectedClientToolName}'.`,
    );

    if (clientToolCalls.length === 0) {
      assertVerify(
        collected.text.includes(expectedText),
        `${label} final text did not include '${expectedText}'. Received: ${collected.text}`,
      );
      logger.log(`  Final text: ${JSON.stringify(collected.text)}`);
      logger.log(`  ${label} PASSED.`);
      logger.log("");
      return;
    }

    const clientResults = await executeSmokeClientToolCalls(
      clientToolCalls,
      localTools,
    );

    logger.log(`  Local client tool results: ${JSON.stringify(clientResults)}`);

    messages = appendToolInteractionMessages(
      messages,
      collected.toolCalls,
      collected.toolResults,
    );
    messages = [
      ...messages,
      ...createToolResultMessages(clientResults),
    ];

    logger.log(`  Follow-up messages: ${JSON.stringify(messages)}`);
  }

  throw new Error(`${label} exceeded the maximum client-tool rounds.`);
}

async function runClientToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  await runClientToolConversation(
    `${scenario.toUpperCase()} CLIENT TOOL CALL - ADD NUMBERS`,
    createChatRequestPayload(
      scenario,
      chatModel,
      "Use the add_numbers tool to add 123 and 456. After the tool result is provided, answer with only the numeric result.",
      [createDeclarativeToolDto(addNumbersTool, "client")],
      `api-client-tool-add-numbers-${scenario}`,
    ),
    "579",
    "add_numbers",
  );

  await runClientToolConversation(
    `${scenario.toUpperCase()} CLIENT TOOL CALL - GET CAPITAL`,
    createChatRequestPayload(
      scenario,
      chatModel,
      "Use the get_capital tool to find the capital of Portugal. After the tool result is provided, answer with only the capital city name.",
      [createDeclarativeToolDto(getCapitalTool, "client")],
      `api-client-tool-get-capital-${scenario}`,
    ),
    "Lisbon",
    "get_capital",
  );
}

async function runServerToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  const capitalStream = await postStreamAndCollect(
    `${scenario.toUpperCase()} SERVER TOOL CALL - GET CAPITAL`,
    createChatRequestPayload(
      scenario,
      chatModel,
      "Use the server get_capital tool to find the capital of Portugal. Answer with only the capital city name.",
      [createDeclarativeToolDto(getCapitalTool, "server")],
      `api-server-tool-get-capital-${scenario}`,
    ),
  );
  const capitalCollected = collectApiStream(capitalStream.chunks);

  assertVerify(
    capitalCollected.toolCalls.some(
      (toolCall) =>
        toolCall.name === "get_capital" && toolCall.executionMode === "server",
    ),
    "Expected streamed get_capital tool call to be marked executionMode='server'.",
  );
  assertVerify(
    capitalCollected.toolResults.some(
      (toolResult) =>
        toolResult.name === "get_capital" && toolResult.executionMode === "server",
    ),
    "Expected streamed get_capital tool result to be marked executionMode='server'.",
  );
  assertVerify(
    capitalCollected.text.includes("Lisbon"),
    `Server tool get_capital final text did not include 'Lisbon'. Received: ${capitalCollected.text}`,
  );
  logger.log(`  Final text: ${JSON.stringify(capitalCollected.text)}`);
  logger.log(`  ${scenario.toUpperCase()} SERVER TOOL CALL - GET CAPITAL PASSED.`);
  logger.log("");

  const numbersStream = await postStreamAndCollect(
    `${scenario.toUpperCase()} SERVER TOOL CALL - ADD NUMBERS`,
    createChatRequestPayload(
      scenario,
      chatModel,
      "Use the server add_numbers tool to add 123 and 456. Answer with only the numeric result.",
      [createDeclarativeToolDto(addNumbersTool, "server")],
      `api-server-tool-add-numbers-${scenario}`,
    ),
  );
  const numbersCollected = collectApiStream(numbersStream.chunks);

  assertVerify(
    numbersCollected.toolCalls.some(
      (toolCall) =>
        toolCall.name === "add_numbers" && toolCall.executionMode === "server",
    ),
    "Expected streamed add_numbers tool call to be marked executionMode='server'.",
  );
  assertVerify(
    numbersCollected.toolResults.some(
      (toolResult) =>
        toolResult.name === "add_numbers" && toolResult.executionMode === "server",
    ),
    "Expected streamed add_numbers tool result to be marked executionMode='server'.",
  );
  assertVerify(
    numbersCollected.text.includes("579"),
    `Server tool add_numbers final text did not include '579'. Received: ${numbersCollected.text}`,
  );
  logger.log(`  Final text: ${JSON.stringify(numbersCollected.text)}`);
  logger.log(`  ${scenario.toUpperCase()} SERVER TOOL CALL - ADD NUMBERS PASSED.`);
  logger.log("");
}

async function runMixedToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  let messages: IAiApiChatMessageDto[] = [
    {
      role: "user",
      content:
        "Use get_capital to find the capital of Portugal. Use add_numbers to add 123 and 456. The get_capital tool is server-owned. The add_numbers tool is client-owned. Final answer format: '<capital> | <sum>'.",
    },
  ];

  const tools = [
    createDeclarativeToolDto(getCapitalTool, "server"),
    createDeclarativeToolDto(addNumbersTool, "client"),
  ];

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
    const streamResponse = await postStreamAndCollect(
      `${scenario.toUpperCase()} MIXED TOOL CALL ROUND ${round}`,
      createChatRequestPayload(
        scenario,
        chatModel,
        "",
        tools,
        `api-mixed-tool-${scenario}`,
        messages,
      ),
    );

    assertVerify(
      streamResponse.status === 200,
      `Mixed tool round ${round} expected HTTP 200.`,
    );

    const collected = collectApiStream(streamResponse.chunks);
    const clientToolCalls = collected.toolCalls.filter(
      (toolCall) => toolCall.name === "add_numbers",
    );
    const clientToolResultsFromServer = collected.toolResults.filter(
      (toolResult) => toolResult.name === "add_numbers",
    );

    logger.log(`  Detected tool calls: ${JSON.stringify(collected.toolCalls)}`);
    logger.log(`  Detected tool results: ${JSON.stringify(collected.toolResults)}`);
    logger.log(`  Detected text: ${JSON.stringify(collected.text)}`);

    const serverCapitalCalls = collected.toolCalls.filter(
      (toolCall) => toolCall.name === "get_capital",
    );
    const clientAddCalls = collected.toolCalls.filter(
      (toolCall) => toolCall.name === "add_numbers",
    );
    const serverCapitalResults = collected.toolResults.filter(
      (toolResult) => toolResult.name === "get_capital",
    );

    assertVerify(
      clientToolResultsFromServer.length === 0,
      "Mixed tool scenario unexpectedly had the server execute client-owned add_numbers.",
    );

    for (const toolCall of serverCapitalCalls) {
      assertVerify(
        toolCall.executionMode === "server",
        "Expected get_capital tool calls to be marked executionMode='server' in mixed mode.",
      );
    }

    for (const toolCall of clientAddCalls) {
      assertVerify(
        toolCall.executionMode === "client",
        "Expected add_numbers tool calls to be marked executionMode='client' in mixed mode.",
      );
    }

    for (const toolResult of serverCapitalResults) {
      assertVerify(
        toolResult.executionMode === "server",
        "Expected get_capital tool results to be marked executionMode='server' in mixed mode.",
      );
    }

    if (clientToolCalls.length === 0) {
      assertVerify(
        collected.text.includes("Lisbon") && collected.text.includes("579"),
        `Mixed tool final text did not include both 'Lisbon' and '579'. Received: ${collected.text}`,
      );
      logger.log(`  Final text: ${JSON.stringify(collected.text)}`);
      logger.log(`  ${scenario.toUpperCase()} MIXED TOOL CALL PASSED.`);
      logger.log("");
      return;
    }

    const clientResults = await executeSmokeClientToolCalls(
      clientToolCalls,
      [addNumbersTool],
    );

    logger.log(`  Local client tool results: ${JSON.stringify(clientResults)}`);

    messages = appendToolInteractionMessages(
      messages,
      collected.toolCalls,
      collected.toolResults,
    );
    messages = [
      ...messages,
      ...createToolResultMessages(clientResults),
    ];

    logger.log(`  Follow-up messages: ${JSON.stringify(messages)}`);
  }

  throw new Error("Mixed tool scenario exceeded the maximum round count.");
}

async function runDelayedClientToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  for (let round = 1; round <= TOOL_DELAY_ROUNDS; round += 1) {
    const clientDelayMs = randomIntInclusive(TOOL_DELAY_MIN_MS, TOOL_DELAY_MAX_MS);
    const label = `${scenario.toUpperCase()} DELAYED CLIENT TOOL ROUND ${round}`;
    let messages: IAiApiChatMessageDto[] = [
      {
        role: "user",
        content: `Use the wait_then_add_numbers tool to add 123 and 456 with a delay of ${clientDelayMs} milliseconds. After the tool result is provided, answer with only the numeric result.`,
      },
    ];

    logger.log(`===== ${label} =====`);
    logger.log(`  Requested clientDelayMs: ${clientDelayMs}`);

    const roundOne = await postStreamAndCollect(
      `${label} ROUND 1`,
      createChatRequestPayload(
        scenario,
        chatModel,
        "",
        [createDeclarativeToolDto(waitThenAddNumbersTool, "client")],
        `api-delayed-client-tool-${scenario}-${round}`,
        messages,
      ),
    );
    const collected = collectApiStream(roundOne.chunks);
    const clientToolCall = collected.toolCalls.find(
      (toolCall) => toolCall.name === "wait_then_add_numbers",
    );

    assertVerify(clientToolCall, `${label} expected wait_then_add_numbers tool call.`);
    assertVerify(
      clientToolCall.executionMode === "client",
      `${label} expected executionMode='client'.`,
    );
    assertVerify(
      !collected.toolResults.some(
        (toolResult) => toolResult.name === "wait_then_add_numbers",
      ),
      `${label} unexpectedly received server tool_result_delta for wait_then_add_numbers.`,
    );

    const clientStartedAt = Date.now();
    const clientResults = await executeSmokeClientToolCalls(
      [clientToolCall],
      [waitThenAddNumbersTool],
    );
    const clientCompletedAt = Date.now();
    const clientElapsedMs = readElapsedMs(clientStartedAt, clientCompletedAt);
    const effectiveClientDelayMs =
      readDelayMsFromClientToolResult(clientResults, "wait_then_add_numbers") ??
      clampToolDelayMs(clientDelayMs);

    logger.log(`  Client tool startedAt: ${clientStartedAt}`);
    logger.log(`  Client tool completedAt: ${clientCompletedAt}`);
    logger.log(`  Client tool elapsedMs: ${clientElapsedMs}`);
    logger.log(`  Effective clientDelayMs: ${effectiveClientDelayMs}`);
    logger.log(`  Local client tool results: ${JSON.stringify(clientResults)}`);

    assertVerify(
      clientElapsedMs >= Math.max(0, effectiveClientDelayMs - 100),
      `${label} client tool elapsed ${clientElapsedMs}ms was shorter than effective delay ${effectiveClientDelayMs}ms. Requested delay was ${clientDelayMs}ms.`,
    );

    messages = appendToolInteractionMessages(
      messages,
      collected.toolCalls,
      collected.toolResults,
    );
    messages = [
      ...messages,
      ...createToolResultMessages(clientResults),
    ];

    const roundTwo = await postStreamAndCollect(
      `${label} ROUND 2`,
      createChatRequestPayload(
        scenario,
        chatModel,
        "",
        [createDeclarativeToolDto(waitThenAddNumbersTool, "client")],
        `api-delayed-client-tool-${scenario}-${round}`,
        messages,
      ),
    );
    const roundTwoCollected = collectApiStream(roundTwo.chunks);

    assertVerify(
      roundTwoCollected.text.includes("579"),
      `${label} final text did not include '579'. Received: ${roundTwoCollected.text}`,
    );
    logger.log(`  Final text: ${JSON.stringify(roundTwoCollected.text)}`);
    logger.log(`  ${label} PASSED.`);
    logger.log("");
  }
}

async function runDelayedServerToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  for (let round = 1; round <= TOOL_DELAY_ROUNDS; round += 1) {
    const serverDelayMs = randomIntInclusive(TOOL_DELAY_MIN_MS, TOOL_DELAY_MAX_MS);
    const label = `${scenario.toUpperCase()} DELAYED SERVER TOOL ROUND ${round}`;

    logger.log(`===== ${label} =====`);
    logger.log(`  Requested serverDelayMs: ${serverDelayMs}`);

    const streamResponse = await postStreamAndCollect(
      `${label} REQUEST`,
      createChatRequestPayload(
        scenario,
        chatModel,
        `Use the server wait_then_get_capital tool to find the capital of Portugal with a delay of ${serverDelayMs} milliseconds. Answer with only the capital city name.`,
        [createWaitThenGetCapitalToolDto()],
        `api-delayed-server-tool-${scenario}-${round}`,
      ),
    );
    const collected = collectApiStream(streamResponse.chunks);
    const toolResult = findOwnedToolResult(collected, "wait_then_get_capital");
    const toolResultTiming = findFirstChunkElapsedByType(
      streamResponse,
      "tool_result_delta",
    );
    const streamElapsedMs = readElapsedMs(
      streamResponse.timings.startedAt,
      streamResponse.timings.completedAt,
    );
    const effectiveServerDelayMs =
      readDelayMsFromServerToolResult(toolResult) ??
      clampToolDelayMs(serverDelayMs);
    const shouldExpectHeartbeat =
      STREAM_HEARTBEAT_INTERVAL_MS > 0 &&
      effectiveServerDelayMs > STREAM_HEARTBEAT_INTERVAL_MS;

    assertVerify(
      toolResult?.executionMode === "server",
      `${label} expected server-owned tool_result_delta for wait_then_get_capital.`,
    );
    assertVerify(
      readDelayMsFromServerToolResult(toolResult) === effectiveServerDelayMs,
      `${label} expected server tool result to include effective delayMs=${effectiveServerDelayMs}. Requested delay was ${serverDelayMs}ms.`,
    );
    assertVerify(
      streamElapsedMs >= Math.max(0, effectiveServerDelayMs - 100),
      `${label} stream elapsed ${streamElapsedMs}ms was shorter than effective server delay ${effectiveServerDelayMs}ms. Requested delay was ${serverDelayMs}ms.`,
    );
    assertVerify(
      collected.text.includes("Lisbon"),
      `${label} final text did not include 'Lisbon'. Received: ${collected.text}`,
    );
    if (shouldExpectHeartbeat) {
      assertVerify(
        collected.heartbeats.some(
          (heartbeat) =>
            heartbeat.phase === "tool_execution" &&
            heartbeat.toolName === "wait_then_get_capital",
        ),
        `${label} expected at least one tool_execution heartbeat for wait_then_get_capital.`,
      );
    }

    logger.log(`  Effective serverDelayMs: ${effectiveServerDelayMs}`);
    logger.log(`  tool_result_delta elapsedMs: ${toolResultTiming ?? "(missing)"}`);
    logger.log(`  stream elapsedMs: ${streamElapsedMs}`);
    logger.log(`  Heartbeats: ${JSON.stringify(collected.heartbeats)}`);
    logger.log(`  Final text: ${JSON.stringify(collected.text)}`);
    logger.log(`  ${label} PASSED.`);
    logger.log("");
  }
}

async function runDelayedMixedToolCallingCheck(
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  for (let round = 1; round <= TOOL_DELAY_ROUNDS; round += 1) {
    const serverDelayMs = randomIntInclusive(TOOL_DELAY_MIN_MS, TOOL_DELAY_MAX_MS);
    const clientDelayMs = randomIntInclusive(TOOL_DELAY_MIN_MS, TOOL_DELAY_MAX_MS);
    const label = `${scenario.toUpperCase()} DELAYED MIXED TOOL ROUND ${round}`;
    let messages: IAiApiChatMessageDto[] = [
      {
        role: "user",
        content:
          `Use wait_then_get_capital to find the capital of Portugal with a delay of ${serverDelayMs} milliseconds. Use wait_then_add_numbers to add 123 and 456 with a delay of ${clientDelayMs} milliseconds. The wait_then_get_capital tool is server-owned. The wait_then_add_numbers tool is client-owned. Final answer format: '<capital> | <sum>'.`,
      },
    ];

    const tools = [
      createWaitThenGetCapitalToolDto(),
      createDeclarativeToolDto(waitThenAddNumbersTool, "client"),
    ];

    logger.log(`===== ${label} =====`);
    logger.log(`  Requested serverDelayMs: ${serverDelayMs}`);
    logger.log(`  Requested clientDelayMs: ${clientDelayMs}`);

    const roundOne = await postStreamAndCollect(
      `${label} ROUND 1`,
      createChatRequestPayload(
        scenario,
        chatModel,
        "",
        tools,
        `api-delayed-mixed-tool-${scenario}-${round}`,
        messages,
      ),
    );
    const collected = collectApiStream(roundOne.chunks);
    const serverToolResult = findOwnedToolResult(
      collected,
      "wait_then_get_capital",
    );
    const pendingClientCall = collected.toolCalls.find(
      (toolCall) => toolCall.name === "wait_then_add_numbers",
    );
    const serverResultTiming = findFirstChunkElapsedByType(
      roundOne,
      "tool_result_delta",
    );
    const streamElapsedMs = readElapsedMs(
      roundOne.timings.startedAt,
      roundOne.timings.completedAt,
    );
    const effectiveServerDelayMs =
      readDelayMsFromServerToolResult(serverToolResult) ??
      clampToolDelayMs(serverDelayMs);
    const shouldExpectHeartbeat =
      STREAM_HEARTBEAT_INTERVAL_MS > 0 &&
      effectiveServerDelayMs > STREAM_HEARTBEAT_INTERVAL_MS;

    assertVerify(
      serverToolResult?.executionMode === "server",
      `${label} expected server wait_then_get_capital tool result from API.`,
    );
    assertVerify(
      pendingClientCall?.executionMode === "client",
      `${label} expected pending client wait_then_add_numbers tool call.`,
    );
    assertVerify(
      !collected.toolResults.some(
        (toolResult) => toolResult.name === "wait_then_add_numbers",
      ),
      `${label} unexpectedly received a server tool result for wait_then_add_numbers.`,
    );
    assertVerify(
      streamElapsedMs >= Math.max(0, effectiveServerDelayMs - 100),
      `${label} stream elapsed ${streamElapsedMs}ms was shorter than effective server delay ${effectiveServerDelayMs}ms. Requested delay was ${serverDelayMs}ms.`,
    );
    if (shouldExpectHeartbeat) {
      assertVerify(
        collected.heartbeats.some(
          (heartbeat) =>
            heartbeat.phase === "tool_execution" &&
            heartbeat.toolName === "wait_then_get_capital",
        ),
        `${label} expected at least one tool_execution heartbeat for wait_then_get_capital.`,
      );
    }

    const clientStartedAt = Date.now();
    const clientResults = await executeSmokeClientToolCalls(
      pendingClientCall ? [pendingClientCall] : [],
      [waitThenAddNumbersTool],
    );
    const clientCompletedAt = Date.now();
    const clientElapsedMs = readElapsedMs(clientStartedAt, clientCompletedAt);
    const effectiveClientDelayMs =
      readDelayMsFromClientToolResult(clientResults, "wait_then_add_numbers") ??
      clampToolDelayMs(clientDelayMs);

    assertVerify(
      clientElapsedMs >= Math.max(0, effectiveClientDelayMs - 100),
      `${label} client delayed tool elapsed ${clientElapsedMs}ms was shorter than effective delay ${effectiveClientDelayMs}ms. Requested delay was ${clientDelayMs}ms.`,
    );

    logger.log(`  Effective serverDelayMs: ${effectiveServerDelayMs}`);
    logger.log(`  Client tool startedAt: ${clientStartedAt}`);
    logger.log(`  Client tool completedAt: ${clientCompletedAt}`);
    logger.log(`  Client tool elapsedMs: ${clientElapsedMs}`);
    logger.log(`  Effective clientDelayMs: ${effectiveClientDelayMs}`);
    logger.log(`  tool_result_delta elapsedMs: ${serverResultTiming ?? "(missing)"}`);
    logger.log(`  stream elapsedMs: ${streamElapsedMs}`);
    logger.log(`  Heartbeats: ${JSON.stringify(collected.heartbeats)}`);
    logger.log(`  Local client tool results: ${JSON.stringify(clientResults)}`);

    messages = appendToolInteractionMessages(
      messages,
      collected.toolCalls,
      collected.toolResults,
    );
    messages = [
      ...messages,
      ...createToolResultMessages(clientResults),
    ];

    const roundTwo = await postStreamAndCollect(
      `${label} ROUND 2`,
      createChatRequestPayload(
        scenario,
        chatModel,
        "",
        tools,
        `api-delayed-mixed-tool-${scenario}-${round}`,
        messages,
      ),
    );
    const roundTwoCollected = collectApiStream(roundTwo.chunks);

    assertVerify(
      roundTwoCollected.text.includes("Lisbon") &&
        roundTwoCollected.text.includes("579"),
      `${label} final text did not include both 'Lisbon' and '579'. Received: ${roundTwoCollected.text}`,
    );

    logger.log(`  Final text: ${JSON.stringify(roundTwoCollected.text)}`);
    logger.log(`  ${label} PASSED.`);
    logger.log("");
  }
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
      ? resolveOllamaChatModel()
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

  await runClientToolCallingCheck(scenario, chatModel);
  await runServerToolCallingCheck(scenario, chatModel);
  await runMixedToolCallingCheck(scenario, chatModel);
  await runDelayedClientToolCallingCheck(scenario, chatModel);
  await runDelayedServerToolCallingCheck(scenario, chatModel);
  await runDelayedMixedToolCallingCheck(scenario, chatModel);
}

logger.log(`Base URL: ${baseUrl}`);
logger.log(`Log: ${logger.logPath}`);
logger.log(`HTTP timeout ms: ${HTTP_TIMEOUT_MS}`);
logger.log(`Stream heartbeat interval ms: ${STREAM_HEARTBEAT_INTERVAL_MS}`);
logger.log(
  `Tool delay config: min=${TOOL_DELAY_MIN_MS} max=${TOOL_DELAY_MAX_MS} rounds=${TOOL_DELAY_ROUNDS}`,
);
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
