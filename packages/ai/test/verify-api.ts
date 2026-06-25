import {
  appendToolInteractionMessages,
  collectApiStream,
  createAiVerifyLogger,
  createScenarioFilter,
  createDeclarativeToolDto,
  createToolResultMessages,
  executeSmokeClientToolCalls,
  extractTextFromApiChatResponseBody,
  fetchJson,
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
  tools?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface IPostedApiStream {
  status: number;
  contentType: string;
  chunks: unknown[];
}

const MAX_TOOL_ROUNDS = 5;

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
  payload: unknown,
): Promise<void> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);
  const response = await postJson(`${baseUrl}/ai/chat`, payload);
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

  const response = await fetch(`${baseUrl}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  logger.log(`  Status: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  logger.log(`  Content-Type: ${contentType}`);

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

  return {
    status: response.status,
    contentType,
    chunks: collected,
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
  const response = await postJson(`${baseUrl}/ai/embeddings`, payload);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  assertVerify(response.status === 200, `${label} expected HTTP 200.`);
  logger.log("");
}

async function postChatAndLog(
  label: string,
  payload: IAiApiChatRequestPayload,
): Promise<unknown> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);

  const response = await postJson(`${baseUrl}/ai/chat`, payload);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  logger.log("");

  assertVerify(response.status === 200, `${label} expected HTTP 200.`);
  return response.body;
}

function createChatRequestPayload(
  scenario: "ollama" | "deepseek",
  model: string,
  prompt: string,
  tools: Array<{ name: string; description?: string; parameters?: Record<string, unknown>; executionMode?: "client" | "server" }>,
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

async function runClientToolConversation(
  label: string,
  payload: IAiApiChatRequestPayload,
  expectedText: string,
  expectedClientToolName: string,
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
      [
        addNumbersTool,
        getCapitalTool,
      ],
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

  await runClientToolCallingCheck(scenario, chatModel);
  await runServerToolCallingCheck(scenario, chatModel);
  await runMixedToolCallingCheck(scenario, chatModel);
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
