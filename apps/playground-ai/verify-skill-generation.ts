// file: apps\playground-ai\verify-skill-generation.ts

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IChatGenerationChunk } from "../../packages/ai/src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../packages/ai/src/chat/chat-generation-request.js";
import type { IAiMessage } from "../../packages/ai/src/common/ai-message.js";
import { AiPromptRenderer } from "../../packages/ai/src/prompts/ai-prompt-renderer.js";
import {
  loadAiSkillFromDirectory,
} from "../../packages/ai/src/skills/ai-skill-loader.js";
import { AiSkillRegistry } from "../../packages/ai/src/skills/ai-skill-registry.js";
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

const DUMP_CHUNKS = process.env.AI_VERIFY_DUMP_CHUNKS === "true";
const promptRenderer = new AiPromptRenderer();
const SKILL_DIRECTORY = path.resolve("apps/skills/computer-use");
const TARGET_DIRECTORY = path.resolve("data/test-directory");
const EXPECTED_IMAGES = [
  "arabervollblut-horse-10333771.jpg",
  "fls3n_kab_cianjur-indonesia-10276956.jpg",
  "genspire_ai_logo_512_smaller_pos.png",
  "genspire_icon_neg.svg",
  "genspire_icon_pos.svg",
  "olivcelso-desert-10106837.svg",
];
const EXPECTED_AI_FILE = "rifkileksono-avocado-9563037.ai";
const EXPECTED_AUDIO = "sofra-dramatic-and-playful-188831.mp3";

const FIXTURE_FILES = [
  "images/arabervollblut-horse-10333771.jpg",
  "images/fls3n_kab_cianjur-indonesia-10276956.jpg",
  "images/genspire_ai_logo_512_smaller_pos.png",
  "images/genspire_icon_neg.svg",
  "nothing/random/rifkileksono-avocado-9563037.ai",
  "nothing/genspire_icon_pos.svg",
  "olivcelso-desert-10106837.svg",
  "sofra-dramatic-and-playful-188831.mp3",
  "test-directory-credits.txt",
] as const;

interface IStreamingExpectedOutput {
  includes?: string[];
  containsResult?: string;
  exactText?: string;
  toolCallsExactly?: number;
  toolResultsExactly?: number;
  expectedToolSequence?: string[];
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getMessageText(content: IAiMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => {
      if (part.type === "text" || part.type === "thinking") {
        return part.text;
      }

      if (part.type === "tool_result") {
        return getMessageText(part.content);
      }

      return "";
    })
    .join("");
}

function createJpegPlaceholder(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}

function createPngPlaceholder(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function createMp3Placeholder(): Uint8Array {
  return new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
}

function createSvgPlaceholder(label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="4" y="32">${label}</text></svg>`;
}

async function writeFixtureFileIfMissing(
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const absolutePath = path.join(TARGET_DIRECTORY, relativePath);
  const file = Bun.file(absolutePath);

  if (await file.exists()) {
    return;
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

async function ensureSkillFixtureDirectory(): Promise<void> {
  await mkdir(TARGET_DIRECTORY, { recursive: true });

  const existingEntries = await readdir(TARGET_DIRECTORY, { withFileTypes: true });
  const hasAnyContent = existingEntries.length > 0;

  if (!hasAnyContent) {
    await mkdir(path.join(TARGET_DIRECTORY, "images"), { recursive: true });
    await mkdir(path.join(TARGET_DIRECTORY, "nothing", "random"), { recursive: true });
  }

  await writeFixtureFileIfMissing(
    "images/arabervollblut-horse-10333771.jpg",
    createJpegPlaceholder(),
  );
  await writeFixtureFileIfMissing(
    "images/fls3n_kab_cianjur-indonesia-10276956.jpg",
    createJpegPlaceholder(),
  );
  await writeFixtureFileIfMissing(
    "images/genspire_ai_logo_512_smaller_pos.png",
    createPngPlaceholder(),
  );
  await writeFixtureFileIfMissing(
    "images/genspire_icon_neg.svg",
    createSvgPlaceholder("genspire-icon-neg"),
  );
  await writeFixtureFileIfMissing(
    "nothing/random/rifkileksono-avocado-9563037.ai",
    "Adobe Illustrator fixture placeholder\n",
  );
  await writeFixtureFileIfMissing(
    "nothing/genspire_icon_pos.svg",
    createSvgPlaceholder("genspire-icon-pos"),
  );
  await writeFixtureFileIfMissing(
    "olivcelso-desert-10106837.svg",
    createSvgPlaceholder("olivcelso-desert"),
  );
  await writeFixtureFileIfMissing(
    EXPECTED_AUDIO,
    createMp3Placeholder(),
  );
  await writeFixtureFileIfMissing(
    "test-directory-credits.txt",
    [
      "Fixture placeholders derived from the local computer-use verification layout.",
      "This directory is git-ignored and may be regenerated by the verifier.",
      "Source names mirror Pixabay-style fixture names for local testing only.",
    ].join("\n"),
  );
}

function normalizeOutput(value: string): string {
  return value.trim().replace(/\r\n/g, "\n");
}

function assertTextContainsResult(
  actualText: string,
  expectedResult: string,
  label: string,
): void {
  const normalizedActual = normalizeOutput(actualText);
  const normalizedExpected = normalizeOutput(expectedResult);

  assertCondition(
    normalizedActual.includes(normalizedExpected),
    `${label} final result mismatch. Expected output to contain ${JSON.stringify(normalizedExpected)}, got ${JSON.stringify(normalizedActual)}.`,
  );
}

function getToolCallNames(chunks: readonly IChatGenerationChunk[]): string[] {
  return chunks
    .filter((chunk) => chunk.type === "tool_call_delta" && chunk.toolCall?.name)
    .map((chunk) => chunk.toolCall!.name);
}

function getToolResultNames(chunks: readonly IChatGenerationChunk[]): string[] {
  return chunks
    .filter((chunk) => chunk.type === "tool_result_delta" && chunk.toolResult?.name)
    .map((chunk) => chunk.toolResult!.name);
}

async function loadComputerUseSkill() {
  const skill = await loadAiSkillFromDirectory(SKILL_DIRECTORY, {
    repositoryRoot: path.resolve("."),
  });
  const prompt = skill.prompts?.find((candidate) =>
    candidate.id === "computer-use-directory-task"
  );

  assertCondition(prompt, "computer-use skill must include prompt 'computer-use-directory-task'.");

  return { prompt, skill };
}

async function createComputerUseSkillRequest(): Promise<IChatGenerationRequest> {
  await ensureSkillFixtureDirectory();
  const { prompt, skill } = await loadComputerUseSkill();
  const skillRegistry = new AiSkillRegistry([skill]);
  const registeredSkill = skillRegistry.get("computer-use");
  const renderedPrompt = promptRenderer.render(prompt, {
    variables: {
      targetDirectory: TARGET_DIRECTORY,
      expectedImages: EXPECTED_IMAGES.join(", "),
      expectedAiFile: EXPECTED_AI_FILE,
      expectedAudio: EXPECTED_AUDIO,
    },
    metadata: {
      source: "verify-skill-generation",
      skill: registeredSkill.name,
      skillDirectory: SKILL_DIRECTORY,
    },
  });
  const renderedMessages = [...renderedPrompt.messages];
  const instructions = skill.instructions?.trim() ?? "";
  const firstRenderedMessage = renderedMessages[0];

  assertCondition(instructions.length > 0, "Skill instructions must not be empty.");

  if (firstRenderedMessage?.role === "system") {
    renderedMessages[0] = {
      ...firstRenderedMessage,
      content: `${instructions}\n\n${getMessageText(firstRenderedMessage.content)}`,
    };
  } else {
    renderedMessages.unshift({
      role: "system",
      content: instructions,
    });
  }

  const visiblePromptText = renderedMessages
    .map((message) => getMessageText(message.content))
    .join("\n");
  const toolNames = skill.tools?.map((tool) => tool.name) ?? [];

  assertCondition(
    registeredSkill.source?.path === SKILL_DIRECTORY,
    `Skill source path must be '${SKILL_DIRECTORY}'.`,
  );
  assertCondition(
    visiblePromptText.includes(TARGET_DIRECTORY),
    `Rendered prompt must include target directory '${TARGET_DIRECTORY}'.`,
  );
  for (const imageName of EXPECTED_IMAGES) {
    assertCondition(
      visiblePromptText.includes(imageName),
      `Rendered prompt must include expected image '${imageName}'.`,
    );
  }
  assertCondition(
    visiblePromptText.includes(EXPECTED_AI_FILE),
    `Rendered prompt must include expected AI file '${EXPECTED_AI_FILE}'.`,
  );
  assertCondition(
    visiblePromptText.includes(EXPECTED_AUDIO),
    `Rendered prompt must include expected audio '${EXPECTED_AUDIO}'.`,
  );
  for (const relativePath of FIXTURE_FILES) {
    const absolutePath = path.join(TARGET_DIRECTORY, relativePath);
    assertCondition(
      await Bun.file(absolutePath).exists(),
      `Fixture file '${absolutePath}' must exist.`,
    );
  }
  assertCondition(
    toolNames.includes("bash"),
    "Skill tools must include 'bash'.",
  );
  assertCondition(
    toolNames.includes("read"),
    "Skill tools must include 'read'.",
  );
  assertCondition(
    toolNames.includes("list"),
    "Skill tools must include 'list'.",
  );
  assertCondition(
    renderedMessages.some((message) =>
      message.role === "system" && getMessageText(message.content).includes(instructions)
    ),
    "Skill instructions must be included in model-visible system messages.",
  );

  return {
    messages: renderedMessages,
    tools: skill.tools ? [...skill.tools] : undefined,
    metadata: {
      ...renderedPrompt.metadata,
      instructions: skill.instructions,
      allowedTools: registeredSkill.allowedTools,
      skillFiles: skill.files?.map((file) => file.path),
    },
    settings: {
      reasoningEffort: "none",
      toolChoice: "auto",
      maxToolSteps: 6,
    },
  };
}

function printGenerationHelp(): void {
  console.log("Available scenarios:");
  console.log("  ollama       - Local Ollama (gemma4:12b + embeddinggemma)");
  console.log("  deepseek     - DeepSeek API (deepseek-v4-flash + deepseek-v4-pro)");
  console.log("");
  console.log("Usage:");
  console.log("  bun run dev:ai-skill:verify");
  console.log("  bun run dev:ai-skill:verify -- --scenarios ollama");
  console.log("  bun run dev:ai-skill:verify -- --scenario ollama");
  console.log("  bun run dev:ai-skill:verify -- --s ollama");
  console.log("  bun run dev:ai-skill:verify -- --ollama-model gemma4:12b --scenarios ollama");
  console.log("  bun run dev:ai-skill:verify -- --list");
  console.log("");
  console.log("Skill:");
  console.log(`  ${SKILL_DIRECTORY}`);
  console.log(`  Target directory: ${TARGET_DIRECTORY}`);
  console.log("  Fixture directory auto-seeds placeholder files when missing.");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST          - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL    - Ollama chat model (default gemma4:12b)");
  console.log("  AI_VERIFY_OLLAMA_MODEL - Override Ollama chat model for verification");
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
  suite: "skill-generation",
  filePrefix: "verify-skill-generation",
});

logger.log(`Log: ${logger.logPath}`);

const scenarios = await createAiVerifyScenarios(logger, {
  ollamaChatModel: cliArgs.model,
});
logScenarioHeader(logger, scenarios, filter);

async function runStreamingAssertionScenario(
  scenario: (typeof scenarios)[number],
  model: string,
  label: string,
  request: IChatGenerationRequest,
  expected: IStreamingExpectedOutput,
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
      applyChunkToSummary(summary, chunk, false);
    }

    logger.log(`  Chunks received: ${chunks.length}`);
    logChatStreamSummary(logger, summary);

    const toolCallNames = getToolCallNames(chunks);
    const toolResultNames = getToolResultNames(chunks);

    if (expected.toolCallsExactly !== undefined) {
      assertCondition(
        summary.toolCallCount === expected.toolCallsExactly,
        `Expected exactly ${expected.toolCallsExactly} tool calls, got ${summary.toolCallCount}.`,
      );
      logger.log(`  Assertion passed: tool calls = ${expected.toolCallsExactly}`);
    }

    if (expected.toolResultsExactly !== undefined) {
      assertCondition(
        summary.toolResultCount === expected.toolResultsExactly,
        `Expected exactly ${expected.toolResultsExactly} tool results, got ${summary.toolResultCount}.`,
      );
      logger.log(`  Assertion passed: tool results = ${expected.toolResultsExactly}`);
    }

    if (expected.expectedToolSequence) {
      assertCondition(
        JSON.stringify(toolCallNames) === JSON.stringify(expected.expectedToolSequence),
        `Expected tool call sequence ${JSON.stringify(expected.expectedToolSequence)}, got ${JSON.stringify(toolCallNames)}.`,
      );
      assertCondition(
        JSON.stringify(toolResultNames) === JSON.stringify(expected.expectedToolSequence),
        `Expected tool result sequence ${JSON.stringify(expected.expectedToolSequence)}, got ${JSON.stringify(toolResultNames)}.`,
      );
      logger.log(`  Assertion passed: tool sequence = ${JSON.stringify(expected.expectedToolSequence)}`);
    }

    if (expected.exactText !== undefined) {
      assertCondition(
        normalizeOutput(summary.fullText) === normalizeOutput(expected.exactText),
        `[${scenario.name}] [${model}] ${label} final text mismatch. Expected ${JSON.stringify(normalizeOutput(expected.exactText))}, got ${JSON.stringify(normalizeOutput(summary.fullText))}.`,
      );
      logger.log("  Assertion passed: exact final output matched.");
    }

    if (expected.containsResult !== undefined) {
      assertTextContainsResult(
        summary.fullText,
        expected.containsResult,
        `[${scenario.name}] [${model}] ${label}`,
      );
      logger.log("  Assertion passed: output contains expected final result.");
    }

    for (const expectedText of expected.includes ?? []) {
      assertCondition(
        summary.fullText.includes(expectedText),
        `[${scenario.name}] [${model}] ${label} missing expected text '${expectedText}'. Full text: ${JSON.stringify(summary.fullText)}`,
      );
      logger.log(`  Assertion passed: output includes ${JSON.stringify(expectedText)}`);
    }

    logger.log(`[${scenario.name}] [${model}] ${label} PASSED.`);

    if (DUMP_CHUNKS) {
      logger.log("");
      logger.log("  --- Stream chunks dump ---");
      for (let index = 0; index < chunks.length; index += 1) {
        logger.log(`  Chunk ${index}: ${JSON.stringify(chunks[index])}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.log(`  [${scenario.name}] [${model}] ${label} error: ${message}`);
    throw error;
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
    const expectedFinalText = `IMAGES=${EXPECTED_IMAGES.join(", ")}
AI_FILE=${EXPECTED_AI_FILE}
AUDIO_PLAYED=${EXPECTED_AUDIO}`;

    await runStreamingAssertionScenario(
      scenario,
      model,
      "WITH FOLDER SKILL - COMPUTER USE",
      await createComputerUseSkillRequest(),
      {
        containsResult: expectedFinalText,
        toolCallsExactly: 4,
        toolResultsExactly: 4,
        expectedToolSequence: ["list", "list", "read", "bash"],
      },
    );
  }
}

logger.log("Skill verification complete.");
await logger.close();
