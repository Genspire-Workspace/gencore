// file: apps\playground-ai\verify-ai-sessions.ts

import {
  authHeaders,
  createAiVerifyLogger,
  createScenarioFilter,
  fetchJson,
  fetchWithTimeout,
  loginSeededAdmin,
  normalizeBaseUrl,
  parseAiVerifyArgs,
  postJson,
  registerAccount,
  shouldRunScenario,
  streamNdjsonOrJson,
} from "./shared/index.js";

interface IAiSessionResponse {
  id: string;
  userId: string;
  title: string | null;
  provider: string | null;
  model: string | null;
  systemPrompt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface IAiSessionListResponse {
  items: IAiSessionResponse[];
}

interface IAiSessionMessageDto {
  id: string;
  sessionId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  name?: string | null;
  provider?: string | null;
  model?: string | null;
  finishReason?: string | null;
  usage?: Record<string, unknown> | null;
  toolCalls?: unknown[] | null;
  toolResults?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface IAiSessionMessageListResponse {
  items: IAiSessionMessageDto[];
}

interface IGenerateAiSessionMessageRequest {
  content: unknown;
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyId?: string;
  systemPrompt?: string;
  tools?: unknown[];
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface IGenerateAiSessionMessageResponse {
  sessionId: string;
  userMessage: IAiSessionMessageDto;
  assistantMessage: IAiSessionMessageDto;
  finishReason?: string;
  usage?: Record<string, unknown>;
  toolCalls?: unknown[];
  toolResults?: unknown[];
  metadata?: Record<string, unknown>;
}

interface IDeleteSessionResponse {
  deleted: boolean;
}

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

const HTTP_TIMEOUT_MS = Math.max(
  readNumberEnv("AI_VERIFY_HTTP_TIMEOUT_MS", 30_000),
  60_000,
);

const cliArgs = parseAiVerifyArgs();

function printSessionsHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama session verification");
  console.log("  deepseek     - DeepSeek session verification");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai-sessions:verify");
  console.log("  bun run dev:ai-sessions:verify -- --base-url http://localhost:3000");
  console.log("  bun run dev:ai-sessions:verify -- --scenarios ollama");
  console.log("  bun run dev:ai-sessions:verify -- --scenario ollama");
  console.log("  bun run dev:ai-sessions:verify -- --s ollama");
  console.log("  bun run dev:ai-sessions:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama");
  console.log("  bun run dev:ai-sessions:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  AI_API_BASE_URL                              - Base URL for the playground API");
  console.log("  AI_VERIFY_SCENARIOS                          - Comma-separated scenario filter");
  console.log("  AI_VERIFY_OLLAMA_MODEL                       - Override Ollama chat model for session verification");
  console.log("  AI_VERIFY_HTTP_TIMEOUT_MS                   - Verifier HTTP timeout");
  console.log("  GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL          - Seeded admin email (required for login)");
  console.log("  GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD       - Seeded admin password (required for login)");
}

if (cliArgs.list) {
  printSessionsHelp();
  process.exit(0);
}

const logger = createAiVerifyLogger({
  suite: "sessions",
  filePrefix: "verify-ai-sessions",
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
  assertVerify(response.status === 200, "Health check expected HTTP 200.");
  logger.log("");
}

async function createSession(
  token: string,
  input: Partial<Record<string, unknown>> = {},
): Promise<IAiSessionResponse> {
  const response = await fetchJson(`${baseUrl}/ai/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  }, HTTP_TIMEOUT_MS);

  assertVerify(
    response.status === 201,
    `Create session expected HTTP 201, received ${response.status}: ${JSON.stringify(response.body)}`,
  );

  return response.body as IAiSessionResponse;
}

async function listSessions(token: string): Promise<IAiSessionListResponse> {
  const response = await fetchJson(`${baseUrl}/ai/sessions`, {
    headers: { authorization: `Bearer ${token}` },
  }, HTTP_TIMEOUT_MS);

  assertVerify(response.status === 200, `List sessions expected HTTP 200, received ${response.status}.`);
  return response.body as IAiSessionListResponse;
}

async function getSession(token: string, id: string): Promise<IAiSessionResponse | null> {
  const response = await fetchJson(`${baseUrl}/ai/sessions/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  }, HTTP_TIMEOUT_MS);

  if (response.status === 404) {
    return null;
  }

  assertVerify(response.status === 200, `Get session expected HTTP 200, received ${response.status}.`);
  return response.body as IAiSessionResponse;
}

async function updateSession(
  token: string,
  id: string,
  input: Partial<Record<string, unknown>>,
): Promise<IAiSessionResponse> {
  const response = await fetchJson(`${baseUrl}/ai/sessions/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  }, HTTP_TIMEOUT_MS);

  assertVerify(response.status === 200, `Update session expected HTTP 200, received ${response.status}.`);
  return response.body as IAiSessionResponse;
}

async function deleteSession(token: string, id: string): Promise<IDeleteSessionResponse> {
  const response = await fetchJson(`${baseUrl}/ai/sessions/${id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  }, HTTP_TIMEOUT_MS);

  assertVerify(response.status === 200, `Delete session expected HTTP 200, received ${response.status}.`);
  return response.body as IDeleteSessionResponse;
}

async function listMessages(
  token: string,
  sessionId: string,
): Promise<IAiSessionMessageListResponse> {
  const response = await fetchJson(`${baseUrl}/ai/sessions/${sessionId}/messages`, {
    headers: { authorization: `Bearer ${token}` },
  }, HTTP_TIMEOUT_MS);

  assertVerify(response.status === 200, `List messages expected HTTP 200, received ${response.status}.`);
  return response.body as IAiSessionMessageListResponse;
}

async function generateMessage(
  token: string,
  sessionId: string,
  input: IGenerateAiSessionMessageRequest,
): Promise<IGenerateAiSessionMessageResponse> {
  const response = await postJson(
    `${baseUrl}/ai/sessions/${sessionId}/messages`,
    input,
    {
      headers: authHeaders(token),
    },
    HTTP_TIMEOUT_MS,
  );

  assertVerify(
    response.status === 200,
    `Generate message expected HTTP 200, received ${response.status}: ${JSON.stringify(response.body)}`,
  );

  return response.body as IGenerateAiSessionMessageResponse;
}

async function streamMessage(
  token: string,
  sessionId: string,
  input: IGenerateAiSessionMessageRequest,
): Promise<{ status: number; chunks: unknown[] }> {
  const response = await fetchWithTimeout(
    `${baseUrl}/ai/sessions/${sessionId}/messages/stream`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    },
    HTTP_TIMEOUT_MS,
  );

  if (response.status !== 200) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Stream message expected HTTP 200, received ${response.status}: ${errorBody}`,
    );
  }

  const chunks: unknown[] = [];
  for await (const chunk of streamNdjsonOrJson(response)) {
    chunks.push(chunk);
    logger.log(`  Chunk: ${JSON.stringify(chunk)}`);
  }

  return { status: response.status, chunks };
}

async function runCrudCheck(token: string, userId: string): Promise<void> {
  logger.log("===== SESSION CRUD =====");

  const created = await createSession(token, {
    title: "Verify Session",
    systemPrompt: "You are concise.",
    metadata: { source: "verify-ai-sessions" },
  });

  logger.log(`  Created: ${JSON.stringify(created)}`);
  assertVerify(created.id, "Created session must have an id.");
  assertVerify(created.userId === userId, "Created session userId must match the registered user.");
  assertVerify(created.title === "Verify Session", "Created session title must match.");
  assertVerify(created.systemPrompt === "You are concise.", "Created session systemPrompt must match.");

  const fetched = await getSession(token, created.id);
  assertVerify(fetched?.id === created.id, "Fetched session id must match created id.");

  const updated = await updateSession(token, created.id, {
    title: "Verify Session Updated",
    provider: "ollama",
  });
  logger.log(`  Updated: ${JSON.stringify(updated)}`);
  assertVerify(updated.title === "Verify Session Updated", "Updated title must match.");
  assertVerify(updated.provider === "ollama", "Updated provider must match.");

  const listed = await listSessions(token);
  logger.log(`  Listed ${listed.items.length} session(s).`);
  assertVerify(
    listed.items.some((session) => session.id === created.id),
    "Listed sessions must include the created session.",
  );

  const deleted = await deleteSession(token, created.id);
  logger.log(`  Deleted: ${JSON.stringify(deleted)}`);
  assertVerify(deleted.deleted === true, "Delete must return deleted=true.");

  const missing = await getSession(token, created.id);
  assertVerify(missing === null, "Deleted session must return 404/null on get.");

  logger.log("  CRUD PASSED.");
  logger.log("");
}

async function runOwnershipCheck(token: string): Promise<void> {
  logger.log("===== SESSION OWNERSHIP =====");

  const ownerSession = await createSession(token, { title: "Owner Session" });
  const otherUser = await registerAccount(baseUrl, undefined, undefined, HTTP_TIMEOUT_MS);

  const foreignGet = await fetchJson(`${baseUrl}/ai/sessions/${ownerSession.id}`, {
    headers: { authorization: `Bearer ${otherUser.accessToken}` },
  }, HTTP_TIMEOUT_MS);

  logger.log(`  Foreign GET status: ${foreignGet.status}`);
  assertVerify(foreignGet.status === 404, "Foreign user GET must return 404.");

  const foreignUpdate = await fetchJson(`${baseUrl}/ai/sessions/${ownerSession.id}`, {
    method: "PATCH",
    headers: authHeaders(otherUser.accessToken),
    body: JSON.stringify({ title: "Hijacked" }),
  }, HTTP_TIMEOUT_MS);

  logger.log(`  Foreign PATCH status: ${foreignUpdate.status}`);
  assertVerify(foreignUpdate.status === 404, "Foreign user PATCH must return 404.");

  const foreignDelete = await fetchJson(`${baseUrl}/ai/sessions/${ownerSession.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${otherUser.accessToken}` },
  }, HTTP_TIMEOUT_MS);

  logger.log(`  Foreign DELETE status: ${foreignDelete.status}`);
  assertVerify(foreignDelete.status === 404, "Foreign user DELETE must return 404.");

  await deleteSession(token, ownerSession.id);
  logger.log("  OWNERSHIP PASSED.");
  logger.log("");
}

async function runMessageReplayCheck(token: string): Promise<void> {
  logger.log("===== SESSION MESSAGE REPLAY =====");

  const session = await createSession(token, {
    title: "Replay Session",
    systemPrompt: "You are concise.",
  });

  const messages = await listMessages(token, session.id);
  logger.log(`  Initial message count: ${messages.items.length}`);
  assertVerify(messages.items.length === 0, "New session must start with no messages.");

  await deleteSession(token, session.id);
  logger.log("  MESSAGE REPLAY PASSED (empty-history baseline).");
  logger.log("");
}

async function runGenerateCheck(
  token: string,
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  const label = `${scenario.toUpperCase()} GENERATE`;
  logger.log(`===== ${label} =====`);

  const session = await createSession(token, {
    title: `Generate ${scenario}`,
    systemPrompt: "You are concise. Answer in one word.",
  });

  const input: IGenerateAiSessionMessageRequest = {
    content: "What is the capital of Portugal?",
    provider: scenario,
    model: chatModel,
    settings: { reasoningEffort: "none" },
    metadata: { smokeTest: `session-generate-${scenario}` },
  };

  logger.log(`  Request: ${JSON.stringify(input)}`);
  const result = await generateMessage(token, session.id, input);
  logger.log(`  Result: ${JSON.stringify(result)}`);

  assertVerify(result.sessionId === session.id, "Generated response sessionId must match.");
  assertVerify(result.userMessage.role === "user", "User message role must be 'user'.");
  assertVerify(result.userMessage.content === input.content, "User message content must match input.");
  assertVerify(result.assistantMessage.role === "assistant", "Assistant message role must be 'assistant'.");
  assertVerify(result.assistantMessage.provider === scenario, "Assistant message provider must match scenario.");
  assertVerify(result.assistantMessage.model === chatModel, "Assistant message model must match request.");

  const messages = await listMessages(token, session.id);
  logger.log(`  Persisted message count: ${messages.items.length}`);
  assertVerify(
    messages.items.length >= 2,
    "List messages must include at least the user and assistant rows.",
  );
  assertVerify(
    messages.items.some((message) => message.id === result.userMessage.id),
    "Persisted messages must include the user message id.",
  );
  assertVerify(
    messages.items.some((message) => message.id === result.assistantMessage.id),
    "Persisted messages must include the assistant message id.",
  );

  const refreshed = await getSession(token, session.id);
  assertVerify(
    refreshed?.title === `Generate ${scenario}`,
    "Session title must not be overwritten when already set.",
  );
  assertVerify(refreshed?.provider === scenario, "Session provider must be updated after generation.");
  assertVerify(refreshed?.model === chatModel, "Session model must be updated after generation.");

  await deleteSession(token, session.id);
  logger.log(`  ${label} PASSED.`);
  logger.log("");
}

async function runStreamCheck(
  token: string,
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  const label = `${scenario.toUpperCase()} STREAM`;
  logger.log(`===== ${label} =====`);

  const session = await createSession(token, {
    title: `Stream ${scenario}`,
    systemPrompt: "You are concise. Answer in one word.",
  });

  const input: IGenerateAiSessionMessageRequest = {
    content: "What is the capital of Spain?",
    provider: scenario,
    model: chatModel,
    settings: { reasoningEffort: "none" },
    metadata: { smokeTest: `session-stream-${scenario}` },
  };

  logger.log(`  Request: ${JSON.stringify(input)}`);
  const result = await streamMessage(token, session.id, input);
  logger.log(`  Chunk count: ${result.chunks.length}`);
  assertVerify(result.chunks.length > 0, "Stream must emit at least one chunk.");

  const firstChunk = result.chunks[0] as Record<string, unknown> | undefined;
  assertVerify(firstChunk?.sessionId === session.id, "Stream chunks must include sessionId.");
  assertVerify(
    typeof firstChunk?.userMessageId === "string",
    "Stream chunks must include userMessageId.",
  );
  assertVerify(
    typeof firstChunk?.assistantMessageId === "string",
    "Stream chunks must include assistantMessageId.",
  );

  const messages = await listMessages(token, session.id);
  logger.log(`  Persisted message count after stream: ${messages.items.length}`);
  assertVerify(
    messages.items.length >= 2,
    "Streamed turn must persist at least user + assistant rows.",
  );

  await deleteSession(token, session.id);
  logger.log(`  ${label} PASSED.`);
  logger.log("");
}

async function runTitleAutoDeriveCheck(
  token: string,
  scenario: "ollama" | "deepseek",
  chatModel: string,
): Promise<void> {
  const label = `${scenario.toUpperCase()} TITLE AUTO-DERIVE`;
  logger.log(`===== ${label} =====`);

  const session = await createSession(token, { systemPrompt: "You are concise." });
  assertVerify(session.title === null, "Session created without title must have null title.");

  const result = await generateMessage(token, session.id, {
    content: "Tell me a short joke.",
    provider: scenario,
    model: chatModel,
    settings: { reasoningEffort: "none" },
  });

  logger.log(`  Assistant message: ${JSON.stringify(result.assistantMessage.content)}`);

  const refreshed = await getSession(token, session.id);
  logger.log(`  Derived title: ${JSON.stringify(refreshed?.title)}`);
  assertVerify(
    refreshed?.title !== null && refreshed?.title !== undefined,
    "Session title must be auto-derived from first user message.",
  );

  await deleteSession(token, session.id);
  logger.log(`  ${label} PASSED.`);
  logger.log("");
}

async function runScenario(
  scenario: "ollama" | "deepseek",
): Promise<void> {
  if (!shouldRunScenario(filter, scenario)) {
    logger.log(`SKIP ${scenario} (filtered out).`);
    logger.log("");
    return;
  }

  const chatModel = (
    cliArgs.model?.trim() ||
    process.env.AI_VERIFY_OLLAMA_MODEL?.trim() ||
    process.env.OLLAMA_CHAT_MODEL?.trim() ||
    "gemma4:12b"
  );

  const account = await loginSeededAdmin(baseUrl, HTTP_TIMEOUT_MS);
  logger.log(`Logged in seeded admin: ${account.email}`);

  await runCrudCheck(account.accessToken, account.userId ?? "");
  await runOwnershipCheck(account.accessToken);
  await runMessageReplayCheck(account.accessToken);
  await runGenerateCheck(account.accessToken, scenario, chatModel);
  await runStreamCheck(account.accessToken, scenario, chatModel);
  await runTitleAutoDeriveCheck(account.accessToken, scenario, chatModel);
}

logger.log(`Base URL: ${baseUrl}`);
logger.log(`Log: ${logger.logPath}`);
logger.log(`HTTP timeout ms: ${HTTP_TIMEOUT_MS}`);
if (filter.values) {
  logger.log(`Filter: ${[...filter.values].join(", ")}`);
}
logger.log("");

await runHealthCheck();
await runScenario("ollama");
await runScenario("deepseek");

logger.log("Verification complete.");
await logger.close();
