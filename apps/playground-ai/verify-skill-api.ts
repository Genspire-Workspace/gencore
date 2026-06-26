import {
  appendToolInteractionMessages,
  authHeaders,
  collectApiStream,
  createAiVerifyLogger,
  createZipBlob,
  createDeclarativeToolDto,
  createScenarioFilter,
  createToolResultMessages,
  executeSmokeClientToolCalls,
  fetchJson,
  fetchWithTimeout,
  normalizeBaseUrl,
  parseAiVerifyArgs,
  postJson,
  registerAccount,
  shouldRunScenario,
  streamNdjsonOrJson,
  type IAiApiChatMessageDto,
} from "./shared/index.js";
import {
  addNumbersTool,
} from "./tools/test-tools.js";
import type {
  IAiOwnedToolCall,
  IAiOwnedToolResult,
} from "./shared/verify-api-tools.js";

interface IAiProviderInfo {
  id: string;
  configured: boolean;
  defaultChatModel?: string;
}

interface IAiProvidersResponse {
  providers: IAiProviderInfo[];
  defaults: Record<string, unknown>;
}

interface IAiSkillResponse {
  id: string;
  name: string;
  description: string;
  executionMode: "server" | "client";
  bundleFormat: "inline" | "zip";
  registered: boolean;
}

interface IAiSkillListResponse {
  items: IAiSkillResponse[];
}

interface IAiSkillDownloadResponse {
  skillId: string;
  fileId: string;
  downloadPath: string;
}

interface IAiApiChatRequestPayload {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  promptVariables?: Record<string, unknown>;
  skillIds?: string[];
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
}

interface IVerifyAccount {
  accessToken: string;
  userId?: string;
}

const MAX_TOOL_ROUNDS = 5;
const HTTP_TIMEOUT_MS = readNumberEnv("AI_VERIFY_HTTP_TIMEOUT_MS", 30_000);
const ACCEPTABLE_CLEANUP_STATUSES = new Set([200, 204, 404]);

function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function assertVerify(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function printSkillApiHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama API verification");
  console.log("  deepseek     - DeepSeek API verification");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai-skill-api:verify");
  console.log("  bun run dev:ai-skill-api:verify -- --base-url http://localhost:3000");
  console.log("  bun run dev:ai-skill-api:verify -- --scenarios ollama");
  console.log("  bun run dev:ai-skill-api:verify -- --ollama-model gemma4:12b --scenarios ollama");
  console.log("  bun run dev:ai-skill-api:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  AI_API_BASE_URL         - Base URL for the playground API");
  console.log("  AI_VERIFY_SCENARIOS     - Comma-separated scenario filter");
  console.log("  AI_VERIFY_OLLAMA_MODEL  - Override Ollama chat model");
  console.log("  AI_VERIFY_HTTP_TIMEOUT_MS - Verifier HTTP timeout");
}

function createRandomSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getToolCallsByName(
  collected: ReturnType<typeof collectApiStream>,
  name: string,
): IAiOwnedToolCall[] {
  return collected.toolCalls.filter((toolCall) => toolCall.name === name);
}

function getToolResultsByName(
  collected: ReturnType<typeof collectApiStream>,
  name: string,
): IAiOwnedToolResult[] {
  return collected.toolResults.filter((toolResult) => toolResult.name === name);
}

function hasServerCapitalCall(
  toolCall: IAiOwnedToolCall,
): boolean {
  return (
    toolCall.name === "get_capital" &&
    toolCall.executionMode === "server" &&
    isRecord(toolCall.arguments) &&
    toolCall.arguments.country === "Portugal"
  );
}

function hasServerCapitalResult(
  toolResult: IAiOwnedToolResult,
): boolean {
  return (
    toolResult.name === "get_capital" &&
    toolResult.executionMode === "server" &&
    isRecord(toolResult.result) &&
    toolResult.result.capital === "Lisbon"
  );
}

function hasClientAddCall(
  toolCall: IAiOwnedToolCall,
): boolean {
  return (
    toolCall.name === "add_numbers" &&
    toolCall.executionMode === "client" &&
    isRecord(toolCall.arguments) &&
    toolCall.arguments.a === 123 &&
    toolCall.arguments.b === 456
  );
}

function assertHasServerCapitalCall(
  collected: ReturnType<typeof collectApiStream>,
  label: string,
): void {
  assertVerify(
    getToolCallsByName(collected, "get_capital").some(hasServerCapitalCall),
    `${label} must include a server get_capital tool call with arguments.country='Portugal'.`,
  );
}

function assertHasServerCapitalResult(
  collected: ReturnType<typeof collectApiStream>,
  label: string,
): void {
  assertVerify(
    getToolResultsByName(collected, "get_capital").some(hasServerCapitalResult),
    `${label} must include a server get_capital tool result with capital='Lisbon'.`,
  );
}

function assertHasClientAddCall(
  collected: ReturnType<typeof collectApiStream>,
  label: string,
): void {
  assertVerify(
    getToolCallsByName(collected, "add_numbers").some(hasClientAddCall),
    `${label} must include a client add_numbers tool call with arguments a=123 and b=456.`,
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

function isConfiguredProvider(
  providersResponse: IAiProvidersResponse,
  providerId: string,
): boolean {
  return providersResponse.providers.some(
    (provider) => provider.id === providerId && provider.configured,
  );
}

function resolveProviderChatModel(
  providersResponse: IAiProvidersResponse,
  providerId: "ollama" | "deepseek",
): string {
  if (providerId === "ollama") {
    return resolveOllamaChatModel();
  }

  return providersResponse.providers.find((provider) => provider.id === providerId)
    ?.defaultChatModel?.trim() || "deepseek-v4-flash";
}

function createChatRequestPayload(
  scenario: "ollama" | "deepseek",
  model: string,
  skillIds: string[],
  smokeTest: string,
  promptVariables: Record<string, unknown>,
  messages: IAiApiChatMessageDto[],
  tools?: IAiApiChatRequestPayload["tools"],
): IAiApiChatRequestPayload {
  return {
    provider: scenario,
    model,
    systemPrompt: "You are concise and must follow the attached skills.",
    skillIds,
    promptVariables,
    messages,
    tools,
    settings: {
      reasoningEffort: "none",
      toolChoice: "auto",
      maxToolSteps: 6,
    },
    metadata: {
      smokeTest,
    },
  };
}

async function runHealthCheck(): Promise<void> {
  logger.log("===== HEALTH =====");
  const response = await fetchJson(`${baseUrl}/health`, undefined, HTTP_TIMEOUT_MS);
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  assertVerify(response.status === 200, "Health check expected HTTP 200.");
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
  assertVerify(response.status === 200, "Providers check expected HTTP 200.");
  logger.log("");
  return response.body as IAiProvidersResponse;
}

async function createServerSkill(
  account: IVerifyAccount,
): Promise<IAiSkillResponse> {
  const name = `verify-server-skill-${createRandomSuffix()}`;
  const response = await postJson(
    `${baseUrl}/ai/skills`,
    {
      visibility: "private",
      name,
      description: "Verifies server-side skill execution through the playground API.",
      instructions:
        "Use the get_capital server tool whenever a country capital is requested. Return exactly CAPITAL=<capital>.",
      executionMode: "server",
      allowedTools: ["get_capital"],
      prompts: [
        {
          name: "capital-request",
          description: "Capital lookup prompt for verification",
          template:
            "Use the get_capital tool to find the capital of {{country}}. Return exactly CAPITAL=<capital>.",
          variables: [
            {
              name: "country",
              required: true,
            },
          ],
        },
      ],
      serverToolNames: ["get_capital"],
    },
    {
      headers: authHeaders(account.accessToken),
    },
    HTTP_TIMEOUT_MS,
  );

  logger.log("===== CREATE SERVER SKILL =====");
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(response.body)}`);
  assertVerify(response.status === 201, "Creating server skill expected HTTP 201.");

  const skill = response.body as IAiSkillResponse;
  assertVerify(skill.executionMode === "server", "Created skill must be server execution mode.");
  assertVerify(skill.bundleFormat === "inline", "Created server skill must be inline.");
  assertVerify(skill.registered, "Created server skill must be registered.");
  logger.log("");
  return skill;
}

async function importClientSkill(
  account: IVerifyAccount,
): Promise<IAiSkillResponse> {
  const name = `verify-client-skill-${createRandomSuffix()}`;
  const bundle = await createZipBlob({
    name: "client-skill.zip",
    files: {
      [`${name}/SKILL.md`]: `---
name: ${name}
description: Verifies client-side skill execution through the playground API.
allowed-tools: add_numbers
---

# Verify Client Skill

Use the add_numbers tool whenever arithmetic is requested.
Return exactly TOTAL=<sum>.

See [the addition prompt](references/client-addition.prompt.md).
`,
      [`${name}/references/client-addition.prompt.md`]: `---
description: Request client-side addition
variables:
  - name: a
    required: true
  - name: b
    required: true
---
Use the add_numbers tool to add {{a}} and {{b}}.
After the tool result is available, return exactly TOTAL=<sum>.
`,
    },
  });
  const formData = new FormData();

  formData.set("file", new File([bundle.blob], bundle.name, {
    type: "application/zip",
  }));
  formData.set("visibility", "private");

  const response = await fetchWithTimeout(
    `${baseUrl}/ai/skills/import`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${account.accessToken}`,
      },
      body: formData,
    },
    HTTP_TIMEOUT_MS,
  );
  const body = await response.json().catch(async () => await response.text());

  logger.log("===== IMPORT CLIENT SKILL =====");
  logger.log(`  Status: ${response.status}`);
  logger.log(`  Body: ${JSON.stringify(body)}`);
  assertVerify(response.status === 201, "Importing client skill expected HTTP 201.");

  const skill = body as IAiSkillResponse;
  assertVerify(skill.executionMode === "client", "Imported skill must be client execution mode.");
  assertVerify(skill.bundleFormat === "zip", "Imported client skill must be zip-backed.");
  assertVerify(skill.registered, "Imported client skill must be registered.");
  logger.log("");
  return skill;
}

async function verifySkillManagementEndpoints(
  account: IVerifyAccount,
  serverSkill: IAiSkillResponse,
  clientSkill: IAiSkillResponse,
): Promise<void> {
  logger.log("===== SKILL MANAGEMENT =====");

  const listResponse = await fetchJson(
    `${baseUrl}/ai/skills?owner=me`,
    {
      headers: authHeaders(account.accessToken),
    },
    HTTP_TIMEOUT_MS,
  );
  logger.log(`  List Status: ${listResponse.status}`);
  logger.log(`  List Body: ${JSON.stringify(listResponse.body)}`);
  assertVerify(listResponse.status === 200, "Listing skills expected HTTP 200.");

  const listedSkills = (listResponse.body as IAiSkillListResponse).items;
  assertVerify(
    listedSkills.some((skill) => skill.id === serverSkill.id),
    "Listed skills must include the created server skill.",
  );
  assertVerify(
    listedSkills.some((skill) => skill.id === clientSkill.id),
    "Listed skills must include the imported client skill.",
  );

  const downloadResponse = await fetchJson(
    `${baseUrl}/ai/skills/${clientSkill.id}/download`,
    {
      headers: {
        authorization: `Bearer ${account.accessToken}`,
      },
    },
    HTTP_TIMEOUT_MS,
  );
  logger.log(`  Download Status: ${downloadResponse.status}`);
  logger.log(`  Download Body: ${JSON.stringify(downloadResponse.body)}`);
  assertVerify(downloadResponse.status === 200, "Client skill download info expected HTTP 200.");

  const downloadInfo = downloadResponse.body as IAiSkillDownloadResponse;
  assertVerify(
    downloadInfo.skillId === clientSkill.id,
    "Client skill download info must reference the imported skill id.",
  );
  assertVerify(
    downloadInfo.downloadPath.includes(downloadInfo.fileId),
    "Client skill download path must include the file id.",
  );

  logger.log("");
}

async function postStreamAndCollect(
  label: string,
  account: IVerifyAccount,
  payload: unknown,
): Promise<IPostedApiStream> {
  logger.log(`===== ${label} =====`);
  logger.log(`  Request: ${JSON.stringify(payload)}`);

  const response = await fetchWithTimeout(
    `${baseUrl}/ai/chat/stream`,
    {
      method: "POST",
      headers: authHeaders(account.accessToken),
      body: JSON.stringify(payload),
    },
    HTTP_TIMEOUT_MS,
  );
  const contentType = response.headers.get("content-type") ?? "";
  const chunks: unknown[] = [];

  logger.log(`  Status: ${response.status}`);
  logger.log(`  Content-Type: ${contentType}`);

  for await (const chunk of streamNdjsonOrJson(response)) {
    chunks.push(chunk);
    logger.log(`  Chunk ${chunks.length}: ${JSON.stringify(chunk)}`);
  }

  logger.log(`  Body: ${JSON.stringify(chunks)}`);
  logger.log("");

  return {
    status: response.status,
    contentType,
    chunks,
  };
}

async function runServerSkillCheck(
  account: IVerifyAccount,
  scenario: "ollama" | "deepseek",
  model: string,
  serverSkillId: string,
): Promise<void> {
  const response = await postStreamAndCollect(
    `${scenario.toUpperCase()} SERVER SKILL`,
    account,
    createChatRequestPayload(
      scenario,
      model,
      [serverSkillId],
      `skill-api-server-${scenario}`,
      { country: "Portugal" },
      [
        {
          role: "user",
          content: "Follow the attached server skill and complete the task.",
        },
      ],
    ),
  );

  assertVerify(response.status === 200, "Server skill stream expected HTTP 200.");

  const collected = collectApiStream(response.chunks);
  const capitalCalls = getToolCallsByName(collected, "get_capital");
  const capitalResults = getToolResultsByName(collected, "get_capital");

  assertVerify(
    capitalCalls.length > 0,
    "Server skill must produce at least one get_capital tool call.",
  );
  assertHasServerCapitalCall(
    collected,
    "Server skill verification",
  );
  assertVerify(
    capitalResults.length > 0,
    "Server skill must produce at least one get_capital tool result.",
  );
  assertHasServerCapitalResult(
    collected,
    "Server skill verification",
  );
  assertVerify(
    collected.text.includes("CAPITAL=Lisbon"),
    `Server skill final text must include 'CAPITAL=Lisbon'. Received: ${collected.text}`,
  );
}

async function runClientSkillCheck(
  account: IVerifyAccount,
  scenario: "ollama" | "deepseek",
  model: string,
  clientSkillId: string,
): Promise<void> {
  let messages: IAiApiChatMessageDto[] = [
    {
      role: "user",
      content: "Follow the attached client skill and complete the task.",
    },
  ];
  let sawClientAddCall = false;
  let sawFinalTotal = false;

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await postStreamAndCollect(
      `${scenario.toUpperCase()} CLIENT SKILL ROUND ${round}`,
      account,
      createChatRequestPayload(
        scenario,
        model,
        [clientSkillId],
        `skill-api-client-${scenario}`,
        { a: 123, b: 456 },
        messages,
        [createDeclarativeToolDto(addNumbersTool, "client")],
      ),
    );

    assertVerify(response.status === 200, `Client skill round ${round} expected HTTP 200.`);

    const collected = collectApiStream(response.chunks);
    const clientToolCalls = getToolCallsByName(collected, "add_numbers");
    const serverToolResults = getToolResultsByName(collected, "add_numbers");

    assertVerify(
      serverToolResults.length === 0,
      "Client skill must not have add_numbers executed on the server.",
    );

    if (clientToolCalls.some(hasClientAddCall)) {
      sawClientAddCall = true;
    }

    if (clientToolCalls.length === 0) {
      if (collected.text.includes("TOTAL=579")) {
        sawFinalTotal = true;
      }

      break;
    }

    assertHasClientAddCall(
      collected,
      `Client skill round ${round}`,
    );

    const clientResults = await executeSmokeClientToolCalls(
      clientToolCalls,
      [addNumbersTool],
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
  }

  assertVerify(
    sawClientAddCall,
    "Client skill scenario must include at least one client add_numbers tool call with the expected arguments.",
  );
  assertVerify(
    sawFinalTotal,
    "Client skill scenario must include final text 'TOTAL=579' after the client tool result is injected.",
  );
}

async function runMixedSkillCheck(
  account: IVerifyAccount,
  scenario: "ollama" | "deepseek",
  model: string,
  serverSkillId: string,
  clientSkillId: string,
): Promise<void> {
  let messages: IAiApiChatMessageDto[] = [
    {
      role: "user",
      content:
        "Use both attached skills. Find the capital of Portugal and add 123 plus 456. Use the available tools instead of asking follow-up questions. Final answer format: 'CAPITAL=<capital> | TOTAL=<sum>'.",
    },
  ];
  let sawServerCapitalCall = false;
  let sawServerCapitalResult = false;
  let sawClientAddCall = false;
  let sawFinalMixedAnswer = false;

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await postStreamAndCollect(
      `${scenario.toUpperCase()} MIXED SKILLS ROUND ${round}`,
      account,
      createChatRequestPayload(
        scenario,
        model,
        [serverSkillId, clientSkillId],
        `skill-api-mixed-${scenario}`,
        { country: "Portugal", a: 123, b: 456 },
        messages,
        [createDeclarativeToolDto(addNumbersTool, "client")],
      ),
    );

    assertVerify(response.status === 200, `Mixed skill round ${round} expected HTTP 200.`);

    const collected = collectApiStream(response.chunks);
    const clientToolCalls = getToolCallsByName(collected, "add_numbers");
    const serverCapitalCalls = getToolCallsByName(collected, "get_capital");
    const serverCapitalResults = getToolResultsByName(collected, "get_capital");
    const serverAddResults = getToolResultsByName(collected, "add_numbers");

    assertVerify(
      serverAddResults.length === 0,
      "Mixed skills must not have add_numbers executed on the server.",
    );

    if (serverCapitalCalls.some(hasServerCapitalCall)) {
      sawServerCapitalCall = true;
    }

    if (serverCapitalResults.some(hasServerCapitalResult)) {
      sawServerCapitalResult = true;
    }

    if (clientToolCalls.some(hasClientAddCall)) {
      sawClientAddCall = true;
    }

    if (clientToolCalls.length === 0) {
      if (
        collected.text.includes("CAPITAL=Lisbon") &&
        collected.text.includes("TOTAL=579")
      ) {
        sawFinalMixedAnswer = true;
      }

      break;
    }

    if (serverCapitalCalls.length > 0) {
      assertHasServerCapitalCall(
        collected,
        `Mixed skill round ${round}`,
      );
    }

    if (serverCapitalResults.length > 0) {
      assertHasServerCapitalResult(
        collected,
        `Mixed skill round ${round}`,
      );
    }

    assertHasClientAddCall(
      collected,
      `Mixed skill round ${round}`,
    );

    const clientResults = await executeSmokeClientToolCalls(
      clientToolCalls,
      [addNumbersTool],
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
  }

  assertVerify(
    sawServerCapitalCall,
    "Mixed skill scenario must include a server get_capital tool call with arguments.country='Portugal'.",
  );
  assertVerify(
    sawServerCapitalResult,
    "Mixed skill scenario must include a server get_capital tool result with capital='Lisbon'.",
  );
  assertVerify(
    sawClientAddCall,
    "Mixed skill scenario must include a client add_numbers tool call with arguments a=123 and b=456.",
  );
  assertVerify(
    sawFinalMixedAnswer,
    "Mixed skill scenario must include final text containing both 'CAPITAL=Lisbon' and 'TOTAL=579'.",
  );
}

async function deleteSkill(
  account: IVerifyAccount,
  skillId: string,
): Promise<number> {
  const response = await fetchJson(
    `${baseUrl}/ai/skills/${skillId}`,
    {
      method: "DELETE",
      headers: authHeaders(account.accessToken),
    },
    HTTP_TIMEOUT_MS,
  );

  logger.log(`Cleanup skill ${skillId}: HTTP ${response.status}`);
  return response.status;
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

  const account = await registerAccount(baseUrl, undefined, undefined, HTTP_TIMEOUT_MS);
  const model = resolveProviderChatModel(providersResponse, scenario);
  let serverSkillId: string | undefined;
  let clientSkillId: string | undefined;
  let verificationError: unknown;
  const cleanupWarnings: string[] = [];

  logger.log(`===== ${scenario.toUpperCase()} ACCOUNT =====`);
  logger.log(`  User: ${account.userId ?? "(unknown)"}`);
  logger.log("");

  try {
    const serverSkill = await createServerSkill(account);
    const clientSkill = await importClientSkill(account);
    serverSkillId = serverSkill.id;
    clientSkillId = clientSkill.id;

    await verifySkillManagementEndpoints(account, serverSkill, clientSkill);
    await runServerSkillCheck(account, scenario, model, serverSkill.id);
    await runClientSkillCheck(account, scenario, model, clientSkill.id);
    await runMixedSkillCheck(account, scenario, model, serverSkill.id, clientSkill.id);

    logger.log(`${scenario.toUpperCase()} skill API verification PASSED.`);
    logger.log("");
  } catch (error) {
    verificationError = error;
    throw error;
  } finally {
    if (serverSkillId) {
      const status = await deleteSkill(account, serverSkillId);

      if (!ACCEPTABLE_CLEANUP_STATUSES.has(status)) {
        cleanupWarnings.push(
          `Unexpected cleanup status for server skill '${serverSkillId}': HTTP ${status}.`,
        );
      }
    }

    if (clientSkillId) {
      const status = await deleteSkill(account, clientSkillId);

      if (!ACCEPTABLE_CLEANUP_STATUSES.has(status)) {
        cleanupWarnings.push(
          `Unexpected cleanup status for client skill '${clientSkillId}': HTTP ${status}.`,
        );
      }
    }

    for (const warning of cleanupWarnings) {
      logger.log(`WARNING: ${warning}`);
    }

    if (!verificationError && cleanupWarnings.length > 0) {
      throw new Error(cleanupWarnings.join(" "));
    }
  }
}

const cliArgs = parseAiVerifyArgs();

if (cliArgs.list) {
  printSkillApiHelp();
  process.exit(0);
}

const logger = createAiVerifyLogger({
  suite: "skill-api",
  filePrefix: "verify-skill-api",
});
const filter = createScenarioFilter(cliArgs.scenarios);
const baseUrl = normalizeBaseUrl(
  cliArgs.baseUrl ?? process.env.AI_API_BASE_URL ?? "http://localhost:3000",
);

logger.log(`Base URL: ${baseUrl}`);
logger.log(`Log: ${logger.logPath}`);
logger.log(`HTTP timeout ms: ${HTTP_TIMEOUT_MS}`);
if (filter.values) {
  logger.log(`Filter: ${[...filter.values].join(", ")}`);
}
logger.log("");

await runHealthCheck();
const providersResponse = await runProvidersCheck();
const executedScenarios: string[] = [];

if (shouldRunScenario(filter, "ollama") && isConfiguredProvider(providersResponse, "ollama")) {
  await runScenario(providersResponse, "ollama");
  executedScenarios.push("ollama");
}

if (shouldRunScenario(filter, "deepseek") && isConfiguredProvider(providersResponse, "deepseek")) {
  await runScenario(providersResponse, "deepseek");
  executedScenarios.push("deepseek");
}

logger.log(
  executedScenarios.length > 0
    ? `Skill API verification complete for: ${executedScenarios.join(", ")}.`
    : "Skill API verification complete with no configured matching providers.",
);
await logger.close();
