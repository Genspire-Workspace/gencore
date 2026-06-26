// file: apps\playground-api\src\ai\ai-provider-model-resolver.ts

export interface IAiProviderModelResolverDefaults {
  chatProvider?: string;
  chatModel?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
}

export interface IAiProviderModelResolveInput {
  provider?: string;
  model?: string;
  kind: "chat" | "embedding";
}

export interface IAiProviderModelResolveResult {
  provider?: string;
  model?: string;
}

export class AiProviderModelResolver {
  constructor(
    private readonly defaults: IAiProviderModelResolverDefaults,
  ) {}

  resolve(input: IAiProviderModelResolveInput): IAiProviderModelResolveResult {
    if (input.kind === "chat") {
      return {
        provider: input.provider ?? this.defaults.chatProvider,
        model: input.model ?? this.defaults.chatModel,
      };
    }

    return {
      provider: input.provider ?? this.defaults.embeddingProvider,
      model: input.model ?? this.defaults.embeddingModel,
    };
  }

  getDefaults(): IAiProviderModelResolverDefaults {
    return { ...this.defaults };
  }
}
