import type { IOpenAICompatibleClientOptions } from "@genspire/ai/providers/openai-compatible";

export interface IAiPlaygroundProviderInfo {
  id: string;
  name: string;
  kind: string;
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  defaultChatModel?: string;
  defaultEmbeddingModel?: string;
  host?: string;
  configured: boolean;
}

export interface IAiPlaygroundProviderDefinition
  extends IAiPlaygroundProviderInfo {
  client?: Omit<IOpenAICompatibleClientOptions, "id" | "name">;
}

function createBearerHeadersFromEnv(
  envVarName: string,
): Record<string, string> | undefined {
  const apiKey = process.env[envVarName]?.trim();

  if (!apiKey) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

export function createAiPlaygroundProviderDefinitions(): readonly IAiPlaygroundProviderDefinition[] {
  const ollamaHost = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  const ollamaDefaultChatModel =
    process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b";
  const ollamaDefaultEmbeddingModel =
    process.env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest";
  const deepseekDefaultChatModel =
    process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-v4-flash";
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());

  return [
    {
      id: "ollama",
      name: "Ollama",
      kind: "ollama",
      supportsChat: true,
      supportsEmbeddings: true,
      defaultChatModel: ollamaDefaultChatModel,
      defaultEmbeddingModel: ollamaDefaultEmbeddingModel,
      host: ollamaHost,
      configured: true,
      client: {
        baseURL: `${ollamaHost.replace(/\/$/, "")}/v1`,
        headers: createBearerHeadersFromEnv("OLLAMA_API_KEY"),
      },
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      kind: "openai-compatible",
      supportsChat: true,
      supportsEmbeddings: false,
      defaultChatModel: deepseekDefaultChatModel,
      configured: deepseekConfigured,
      client: deepseekConfigured
        ? {
          baseURL:
              process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
          apiKey: process.env.DEEPSEEK_API_KEY,
        }
        : undefined,
    },
  ];
}
