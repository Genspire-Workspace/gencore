// file: apps/playground-app-ai/src/ai/providers.ts

import path from "node:path";
import type { IAiDefaults } from "../../../../packages/ai/src/extension/ai-extension.js";
import type { IAiProviderClient } from "../../../../packages/ai/src/providers/ai-provider-client.js";
import { OllamaClient } from "../../../../packages/ai/src/providers/ollama/index.js";
import { OpenAICompatibleClient } from "../../../../packages/ai/src/providers/openai-compatible/index.js";
import type { IDefaultModelCapabilities } from "../verify/shared/capabilities.js";

export interface AiAppProviderConfig {
  client: IAiProviderClient;
  chatModel: string;
  chatModels: string[];
  embeddingModel?: string;
  supportsEmbedding: boolean;
  defaultModelCapabilities?: IDefaultModelCapabilities;
  imagePath?: string;
  visionPrompt?: string;
  visionExpected?: string;
}

type EnvRecord = Record<string, string | undefined>;

function bearerHeadersFromEnv(
  env: EnvRecord,
  name: string,
): Record<string, string> | undefined {
  const apiKey = env[name]?.trim();

  if (!apiKey) {
    return undefined;
  }

  return { Authorization: `Bearer ${apiKey}` };
}

function optionalEnv(env: EnvRecord, name: string): string | undefined {
  const value = env[name]?.trim();
  return value || undefined;
}

function splitModelsCsv(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

// Local Ollama model names (e.g. gemma4:12b) are not in the catalogue; default
// them to a multimodal reasoning model so image+text parts and reasoning run.
const OLLAMA_DEFAULT_CAPABILITIES: IDefaultModelCapabilities = {
  inputModalities: ["text", "image"],
  reasoning: true,
  toolCall: true,
};

// Default vision image + prompt used by the Ollama run-all verification.
export const OLLAMA_DEFAULT_IMAGE_PATH = path.resolve(
  import.meta.dirname,
  "../../../../data/test-directory/images/arabervollblut-horse-10333771.jpg",
);
export const OLLAMA_VISION_PROMPT = "What animal is in this image? Answer with one word.";
export const OLLAMA_VISION_EXPECTED = "horse";

// DeepSeek chat models are text + reasoning by default.
const DEEPSEEK_DEFAULT_CAPABILITIES: IDefaultModelCapabilities = {
  inputModalities: ["text"],
  reasoning: true,
  toolCall: true,
};

export function createAiAppProvidersFromEnv(
  env: EnvRecord = process.env as EnvRecord,
): AiAppProviderConfig[] {
  const ollamaHost = optionalEnv(env, "OLLAMA_HOST") ?? "http://127.0.0.1:11434";
  const ollamaChatModels =
    splitModelsCsv(env.OLLAMA_CHAT_MODELS) ??
    [optionalEnv(env, "OLLAMA_CHAT_MODEL") ?? "gemma4:12b"];
  const ollamaChatModel = ollamaChatModels[0] ?? "gemma4:12b";
  const ollamaEmbedModel =
    optionalEnv(env, "OLLAMA_EMBED_MODEL") ?? "embeddinggemma:latest";

  const configs: AiAppProviderConfig[] = [
    {
      client: new OllamaClient({
        id: "ollama",
        name: "Ollama",
        host: ollamaHost,
        headers: bearerHeadersFromEnv(env, "OLLAMA_API_KEY"),
        defaultModel: ollamaChatModel,
      }),
      chatModel: ollamaChatModel,
      chatModels: ollamaChatModels,
      embeddingModel: ollamaEmbedModel,
      supportsEmbedding: true,
      defaultModelCapabilities: OLLAMA_DEFAULT_CAPABILITIES,
      imagePath: OLLAMA_DEFAULT_IMAGE_PATH,
      visionPrompt: OLLAMA_VISION_PROMPT,
      visionExpected: OLLAMA_VISION_EXPECTED,
    },
  ];

  const deepseekApiKey = optionalEnv(env, "DEEPSEEK_API_KEY");

  if (deepseekApiKey) {
    const deepseekChatModels =
      splitModelsCsv(env.DEEPSEEK_CHAT_MODELS) ??
      [optionalEnv(env, "DEEPSEEK_CHAT_MODEL") ?? "deepseek-v4-flash"];
    const deepseekChatModel = deepseekChatModels[0] ?? "deepseek-v4-flash";
    const deepseekEmbedModel = optionalEnv(env, "DEEPSEEK_EMBED_MODEL");

    configs.push({
      client: new OpenAICompatibleClient({
        id: "deepseek",
        name: "DeepSeek",
        baseURL:
          optionalEnv(env, "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1",
        apiKey: deepseekApiKey,
      }),
      chatModel: deepseekChatModel,
      chatModels: deepseekChatModels,
      embeddingModel: deepseekEmbedModel,
      supportsEmbedding: Boolean(deepseekEmbedModel),
      defaultModelCapabilities: DEEPSEEK_DEFAULT_CAPABILITIES,
    });
  }

  const filter = optionalEnv(env, "AI_APP_PROVIDER");

  if (filter) {
    const allowed = new Set(
      filter.split(",").map((id) => id.trim().toLowerCase()).filter(Boolean),
    );
    return configs.filter((config) => allowed.has(config.client.id.toLowerCase()));
  }

  return configs;
}

export interface AiAppClientsFromEnv {
  clients: IAiProviderClient[];
  defaults: IAiDefaults;
}

export function createAiAppClientsFromEnv(
  env: EnvRecord = process.env as EnvRecord,
): AiAppClientsFromEnv {
  const configs = createAiAppProvidersFromEnv(env);
  const first = configs[0];

  return {
    clients: configs.map((config) => config.client),
    defaults: {
      chatProvider: first?.client.id,
      chatModel: first?.chatModel,
      embeddingProvider: first?.client.id,
      embeddingModel: first?.embeddingModel,
    },
  };
}