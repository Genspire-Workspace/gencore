import type { IAiDefaults, IAiProviderResolver } from "../../../extension/ai-extension.js";
import type { IAiProviderClient } from "../../../providers/ai-provider-client.js";
import { OpenAICompatibleClient } from "../../../providers/openai-compatible/index.js";
import type { ISeedAiProviderInput } from "./ai-provider-model-seeder.js";

export interface IAiRuntimeProviderInfo extends ISeedAiProviderInput {
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  defaultChatModel?: string;
  defaultEmbeddingModel?: string;
  host?: string;
  configured: boolean;
  client?: ConstructorParameters<typeof OpenAICompatibleClient>[0];
}

export interface IAiProviderDiscoveryResponse {
  providers: IAiRuntimeProviderInfo[];
  defaults: IAiDefaults;
}

const PROVIDER_PREFIX = "provider:";
const OPENAI_COMPATIBLE_PREFIX = "openai-compatible:";

export class AiProviderRuntimeCatalogue implements IAiProviderResolver {
  private _providersById?: ReadonlyMap<string, IAiRuntimeProviderInfo>;

  constructor(
    private readonly defaults: IAiDefaults,
    private readonly providers: readonly IAiRuntimeProviderInfo[],
  ) {}

  static createDefault(
    env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  ): AiProviderRuntimeCatalogue {
    const defaults: IAiDefaults = {
      chatProvider: env.AI_CHAT_PROVIDER ?? "ollama",
      chatModel: env.AI_CHAT_MODEL ?? env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
      embeddingProvider: env.AI_EMBEDDING_PROVIDER ?? "ollama",
      embeddingModel:
        env.AI_EMBEDDING_MODEL ?? env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
    };

    const ollamaHost = env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    const deepseekBaseUrl = env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
    const deepseekApiKey = env.DEEPSEEK_API_KEY?.trim();

    const providers: IAiRuntimeProviderInfo[] = [
      {
        id: "ollama",
        name: "Ollama",
        kind: "local",
        clientKind: "ollama",
        api: "ollama",
        website: "https://ollama.com",
        baseUrl: `${ollamaHost.replace(/\/$/, "")}/v1`,
        supportsChat: true,
        supportsEmbeddings: true,
        defaultChatModel: env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
        defaultEmbeddingModel: env.OLLAMA_EMBED_MODEL ?? "embeddinggemma:latest",
        host: ollamaHost,
        configured: true,
        client: {
          id: "ollama",
          name: "Ollama",
          baseURL: `${ollamaHost.replace(/\/$/, "")}/v1`,
          headers: env.OLLAMA_API_KEY?.trim()
            ? { Authorization: `Bearer ${env.OLLAMA_API_KEY.trim()}` }
            : undefined,
        },
      },
      {
        id: "deepseek",
        name: "DeepSeek",
        kind: "cloud",
        clientKind: "openai-compatible",
        api: deepseekBaseUrl,
        doc: "https://api-docs.deepseek.com/quick_start/pricing",
        website: "https://www.deepseek.com",
        baseUrl: deepseekBaseUrl,
        supportsChat: true,
        supportsEmbeddings: false,
        defaultChatModel: env.DEEPSEEK_CHAT_MODEL ?? "deepseek-v4-flash",
        configured: Boolean(deepseekApiKey),
        client: deepseekApiKey
          ? {
              id: "deepseek",
              name: "DeepSeek",
              baseURL: deepseekBaseUrl,
              apiKey: deepseekApiKey,
            }
          : undefined,
      },
    ];

    return new AiProviderRuntimeCatalogue(defaults, providers);
  }

  resolve(input: {
    provider?: string;
    model?: string;
    kind: "chat" | "embedding";
  }): {
    provider?: string;
    model?: string;
  } {
    const provider =
      input.provider ??
      (input.kind === "chat" ? this.defaults.chatProvider : this.defaults.embeddingProvider);
    const model =
      input.model ??
      (input.kind === "chat" ? this.defaults.chatModel : this.defaults.embeddingModel);

    return {
      provider: this.resolveProviderAlias(provider, model, input.kind) ?? provider,
      model,
    };
  }

  getDefaults(): IAiDefaults {
    return { ...this.defaults };
  }

  listConfiguredProviders(): IAiRuntimeProviderInfo[] {
    return this.providers.map((provider) => ({ ...provider, client: undefined }));
  }

  toDiscoveryResponse(): IAiProviderDiscoveryResponse {
    return {
      providers: this.listConfiguredProviders(),
      defaults: this.getDefaults(),
    };
  }

  createSeedInputs(): ISeedAiProviderInput[] {
    return this.providers.map(({ client: _client, supportsChat: _supportsChat, supportsEmbeddings: _supportsEmbeddings, defaultChatModel: _defaultChatModel, defaultEmbeddingModel: _defaultEmbeddingModel, host: _host, configured: _configured, ...provider }) => ({
      ...provider,
    }));
  }

  createClients(): IAiProviderClient[] {
    return this.providers
      .filter((provider) => provider.client)
      .map((provider) => new OpenAICompatibleClient(provider.client!));
  }

  private resolveProviderAlias(
    provider: string | undefined,
    model: string | undefined,
    kind: "chat" | "embedding",
  ): string | undefined {
    if (!provider) {
      return undefined;
    }

    const normalizedProvider = provider.trim();
    if (!normalizedProvider) {
      return undefined;
    }

    const explicitProvider = this.unwrapExplicitProvider(normalizedProvider);
    if (this.providersById.has(explicitProvider)) {
      return explicitProvider;
    }

    if (explicitProvider === "openai-compatible") {
      return (
        this.inferProviderFromModel(model, kind) ??
        this.resolveUniqueProviderByClientKind("openai-compatible", kind) ??
        explicitProvider
      );
    }

    return normalizedProvider;
  }

  private unwrapExplicitProvider(provider: string): string {
    const withoutPrefix = provider.startsWith(PROVIDER_PREFIX)
      ? provider.slice(PROVIDER_PREFIX.length)
      : provider;

    if (withoutPrefix.startsWith(OPENAI_COMPATIBLE_PREFIX)) {
      return withoutPrefix.slice(OPENAI_COMPATIBLE_PREFIX.length);
    }

    return withoutPrefix;
  }

  private inferProviderFromModel(
    model: string | undefined,
    kind: "chat" | "embedding",
  ): string | undefined {
    if (!model) {
      return undefined;
    }

    const normalizedModel = model.trim().toLowerCase();
    if (!normalizedModel) {
      return undefined;
    }

    const matches = this.providers.filter((provider) => {
      if (kind === "chat" && !provider.supportsChat) {
        return false;
      }
      if (kind === "embedding" && !provider.supportsEmbeddings) {
        return false;
      }

      const defaultModel =
        kind === "chat" ? provider.defaultChatModel : provider.defaultEmbeddingModel;
      return (
        defaultModel?.toLowerCase() === normalizedModel ||
        normalizedModel === provider.id.toLowerCase() ||
        normalizedModel.startsWith(`${provider.id.toLowerCase()}-`) ||
        normalizedModel.startsWith(`${provider.id.toLowerCase()}:`)
      );
    });

    return matches.length === 1 ? matches[0]!.id : undefined;
  }

  private resolveUniqueProviderByClientKind(
    clientKind: IAiRuntimeProviderInfo["clientKind"],
    kind: "chat" | "embedding",
  ): string | undefined {
    const matches = this.providers.filter((provider) => {
      if (provider.clientKind !== clientKind) {
        return false;
      }
      if (kind === "chat") {
        return provider.supportsChat && provider.configured;
      }
      return provider.supportsEmbeddings && provider.configured;
    });

    return matches.length === 1 ? matches[0]!.id : undefined;
  }

  private get providersById(): ReadonlyMap<string, IAiRuntimeProviderInfo> {
    return this._providersById ??= new Map(
      this.providers.map((provider) => [provider.id, provider]),
    );
  }
}
