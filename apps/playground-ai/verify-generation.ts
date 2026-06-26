// file: apps\playground-ai\verify-generation.ts

import type { IChatGenerationChunk } from "../../packages/ai/src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../packages/ai/src/chat/chat-generation-request.js";
import type { IEmbeddingGenerationRequest } from "../../packages/ai/src/embeddings/embedding-generation-request.js";
import { AiPromptRenderer } from "../../packages/ai/src/prompts/ai-prompt-renderer.js";
import { defineAiPrompt } from "../../packages/ai/src/prompts/define-ai-prompt.js";
import { AiSkillRegistry } from "../../packages/ai/src/skills/ai-skill-registry.js";
import { defineAiSkill } from "../../packages/ai/src/skills/define-ai-skill.js";
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
  waitThenAddNumbersTool,
} from "./tools/test-tools.js";

const DUMP_CHUNKS = process.env.AI_VERIFY_DUMP_CHUNKS === "true";
const promptRenderer = new AiPromptRenderer();

interface IStreamingExpectedOutput {
  includes: string[];
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getMessageText(content: IChatGenerationRequest["messages"][number]["content"]): string {
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

function createComplexSkillPromptRequest(
  country: string,
  firstAddend: number,
  secondAddend: number,
  finalAddend: number,
): IChatGenerationRequest {
  const prompt = defineAiPrompt({
    id: "capital-math-answer",
    name: "Capital Math Answer",
    description: "Renders a multi-step tool request with a capital lookup and chained arithmetic.",
    template: [
      {
        role: "system",
        content:
          "You answer using tools when needed and complete every required tool step before answering.",
      },
      {
        role: "user",
        content:
          "Use the get_capital tool to find the capital of {{country}}. Then use the wait_then_add_numbers tool to add {{firstAddend}} and {{secondAddend}} with a delay of 25 ms. Then use the add_numbers tool to add that result to {{finalAddend}}. Respond using exactly this format: CAPITAL=<capital>; TOTAL=<total>.",
      },
    ],
    variables: [
      { name: "country", required: true },
      { name: "firstAddend", required: true },
      { name: "secondAddend", required: true },
      { name: "finalAddend", required: true },
    ],
  });
  const skill = defineAiSkill({
    name: "capital-math-lookup",
    description: "Looks up a capital city and completes chained arithmetic when a task combines both.",
    instructions:
      "Use get_capital first, then wait_then_add_numbers, then add_numbers, and only then produce the final formatted answer.",
    prompts: [prompt],
    tools: [getCapitalTool, waitThenAddNumbersTool, addNumbersTool],
    allowedTools: ["get_capital", "wait_then_add_numbers", "add_numbers"],
  });
  const skillRegistry = new AiSkillRegistry([skill]);
  const registeredSkill = skillRegistry.get("capital-math-lookup");
  const renderedPrompt = promptRenderer.render(prompt, {
    variables: {
      country,
      firstAddend,
      secondAddend,
      finalAddend,
    },
    metadata: {
      source: "verify-generation",
      skill: registeredSkill.name,
    },
  });
  const renderedMessages = [...renderedPrompt.messages];
  const instructions = skill.instructions?.trim();
  const firstRenderedMessage = renderedMessages[0];

  if (instructions) {
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
  }

  const visiblePromptText = renderedMessages
    .map((message) => getMessageText(message.content))
    .join("\n");
  const toolNames = skill.tools?.map((tool) => tool.name) ?? [];

  assertCondition(
    visiblePromptText.includes(country),
    `Rendered prompt must include country '${country}'.`,
  );
  assertCondition(
    visiblePromptText.includes(String(firstAddend)),
    `Rendered prompt must include first addend '${firstAddend}'.`,
  );
  assertCondition(
    visiblePromptText.includes(String(secondAddend)),
    `Rendered prompt must include second addend '${secondAddend}'.`,
  );
  assertCondition(
    visiblePromptText.includes(String(finalAddend)),
    `Rendered prompt must include final addend '${finalAddend}'.`,
  );
  assertCondition(
    registeredSkill.name === "capital-math-lookup",
    "Skill registry must return 'capital-math-lookup'.",
  );
  assertCondition(
    toolNames.includes("get_capital"),
    "Skill tools must include 'get_capital'.",
  );
  assertCondition(
    toolNames.includes("wait_then_add_numbers"),
    "Skill tools must include 'wait_then_add_numbers'.",
  );
  assertCondition(
    toolNames.includes("add_numbers"),
    "Skill tools must include 'add_numbers'.",
  );
  assertCondition(
    renderedMessages.some((message) =>
      message.role === "system" && getMessageText(message.content).includes(skill.instructions ?? "")
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
    },
    settings: {
      reasoningEffort: "none",
      toolChoice: "auto",
      maxToolSteps: 5,
    },
  };
}

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
  console.log("  bun run dev:ai:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama");
  console.log("  bun run dev:ai:verify -- --list");
  console.log("");
  console.log("Env vars:");
  console.log("  OLLAMA_HOST          - Ollama server URL (default http://127.0.0.1:11434)");
  console.log("  OLLAMA_CHAT_MODEL    - Ollama chat model (default gemma4:12b)");
  console.log("  AI_VERIFY_OLLAMA_MODEL - Override Ollama chat model for verification");
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

const scenarios = await createAiVerifyScenarios(logger, {
  ollamaChatModel: cliArgs.model,
});
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

async function runStreamingAssertionTest(
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

    for (const expectedText of expected.includes) {
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
      "WITH TOOL CALL - CAPITAL + CHAINED MATH",
      {
        messages: [
          {
            role: "user",
            content:
              "Use the get_capital tool to find the capital of Japan. Then use the wait_then_add_numbers tool to add 12 and 30 with a delay of 25 ms. Then use the add_numbers tool to add that result to 8. Respond using exactly this format: CAPITAL=<capital>; TOTAL=<total>.",
          },
        ],
        tools: [getCapitalTool, waitThenAddNumbersTool, addNumbersTool],
        settings: {
          reasoningEffort: "none",
          toolChoice: "auto",
          maxToolSteps: 5,
        },
      },
      false,
    );

    await runStreamingAssertionTest(
      scenario,
      model,
      "WITH PROMPT + SKILL - CAPITAL + CHAINED MATH",
      createComplexSkillPromptRequest("Japan", 12, 30, 8),
      {
        includes: ["CAPITAL=Tokyo", "TOTAL=50"],
      },
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
