import { AiClientRegistry } from "../../src/clients/ai-client-registry.js";
import { AiService } from "../../src/services/ai-service.js";
import { OpenAICompatibleClient } from "../../src/clients/openai-compatible/index.js";
import { shouldRunScenario } from "./verify-args.js";
import type {
  IAiVerifyLogger,
  IAiVerifyRuntimeOptions,
  IAiVerifyScenario,
  IAiVerifyScenarioFilter,
} from "./verify-types.js";

function createOllamaHeaders(): Record<string, string> | undefined {
  const apiKey = process.env.OLLAMA_API_KEY?.trim();

  if (!apiKey) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function createAiVerifyScenarios(
  logger: IAiVerifyLogger,
  options: IAiVerifyRuntimeOptions = {},
): Promise<IAiVerifyScenario[]> {
  const scenarios: IAiVerifyScenario[] = [];
  const ollamaChatModel =
    options.ollamaChatModel?.trim() ||
    process.env.AI_VERIFY_OLLAMA_MODEL?.trim() ||
    process.env.OLLAMA_CHAT_MODEL?.trim() ||
    "gemma4:12b";

  try {
    const { OllamaClient } = await import("../../src/clients/ollama/index.js");

    const ollamaClient = new OllamaClient({
      id: "ollama",
      name: "Ollama",
      host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
      headers: createOllamaHeaders(),
    });

    const registry = new AiClientRegistry();
    registry.register(ollamaClient);

    scenarios.push({
      id: "ollama",
      name: "OLLAMA",
      service: new AiService(registry, {
        chatProvider: "ollama",
        embeddingProvider: "ollama",
        embeddingModel: process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
      }),
      chatModels: [ollamaChatModel],
      embedModel: process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
      supportsEmbedding: true,
    });
  } catch (error) {
    logger.log(
      `SKIP Ollama: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (!deepseekApiKey) {
    logger.log("SKIP DeepSeek: DEEPSEEK_API_KEY not set.");
  } else {
    const deepseekClient = new OpenAICompatibleClient({
      id: "deepseek",
      name: "DeepSeek",
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
      apiKey: deepseekApiKey,
    });

    const registry = new AiClientRegistry();
    registry.register(deepseekClient);

    scenarios.push({
      id: "deepseek",
      name: "DEEPSEEK",
      service: new AiService(registry, {
        chatProvider: "deepseek",
        embeddingProvider: "deepseek",
        embeddingModel: process.env.DEEPSEEK_EMBED_MODEL ?? "",
      }),
      chatModels: process.env.DEEPSEEK_CHAT_MODELS
        ? process.env.DEEPSEEK_CHAT_MODELS.split(",")
          .map((model) => model.trim())
          .filter(Boolean)
        : ["deepseek-v4-flash", "deepseek-v4-pro"],
      embedModel: process.env.DEEPSEEK_EMBED_MODEL || undefined,
      supportsEmbedding: Boolean(process.env.DEEPSEEK_EMBED_MODEL),
    });
  }

  return scenarios;
}

export function logScenarioHeader(
  logger: IAiVerifyLogger,
  scenarios: readonly IAiVerifyScenario[],
  filter: IAiVerifyScenarioFilter,
): void {
  logger.log(`Scenarios: ${scenarios.map((scenario) => scenario.name).join(", ")}`);

  if (filter.values) {
    logger.log(`Filter: ${[...filter.values].join(", ")}`);
  }

  logger.log("");
}

export function shouldSkipScenario(
  filter: IAiVerifyScenarioFilter,
  scenario: IAiVerifyScenario,
): boolean {
  return !shouldRunScenario(filter, scenario.id);
}
