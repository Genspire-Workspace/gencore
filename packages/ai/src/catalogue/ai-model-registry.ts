import { AiError } from "../errors/ai-error.js";
import type { IAiProvider } from "./ai-provider.js";
import type { IAiModel } from "./ai-model.js";
import type { IAiModelEndpoint } from "./ai-model-endpoint.js";
import type { AiInputModality, AiOutputModality } from "./ai-model-capability.js";
import type { AiProviderProtocol } from "./ai-provider-protocol.js";

export interface IAiModelRegistryData {
  providers: readonly IAiProvider[];
  models: readonly IAiModel[];
  endpoints: readonly IAiModelEndpoint[];
}

export interface IAiModelFilter {
  providerId?: string;
  ownerProviderId?: string;
  kind?: IAiModel["kind"];
  chat?: boolean;
  embeddings?: boolean;
  tools?: boolean;
  reasoning?: boolean;
  vision?: boolean;
  inputModality?: AiInputModality;
  outputModality?: AiOutputModality;
}

export interface IAiModelEndpointFilter {
  providerId?: string;
  modelId?: string;
  protocol?: AiProviderProtocol;
  enabled?: boolean;
  deprecated?: boolean;
}

export class AiModelRegistry {
  private readonly providers = new Map<string, IAiProvider>();
  private readonly models = new Map<string, IAiModel>();
  private readonly endpoints = new Map<string, IAiModelEndpoint>();

  constructor(data?: Partial<IAiModelRegistryData>) {
    for (const provider of data?.providers ?? []) {
      this.providers.set(provider.id, provider);
    }

    for (const model of data?.models ?? []) {
      this.models.set(model.id, model);
    }

    for (const endpoint of data?.endpoints ?? []) {
      this.endpoints.set(endpoint.id, endpoint);
    }
  }

  listProviders(): readonly IAiProvider[] {
    return [...this.providers.values()];
  }

  listModels(filter?: IAiModelFilter): readonly IAiModel[] {
    const models = [...this.models.values()];

    if (!filter) {
      return models;
    }

    return models.filter((model) => {
      if (filter.ownerProviderId && model.ownerProviderId !== filter.ownerProviderId) return false;
      if (filter.kind && model.kind !== filter.kind) return false;
      if (filter.chat !== undefined && model.capabilities.chat !== filter.chat) return false;
      if (filter.embeddings !== undefined && model.capabilities.embeddings !== filter.embeddings) return false;
      if (filter.tools !== undefined && model.capabilities.tools !== filter.tools) return false;
      if (filter.reasoning !== undefined && model.capabilities.reasoning !== filter.reasoning) return false;
      if (filter.vision !== undefined && model.capabilities.vision !== filter.vision) return false;

      if (
        filter.inputModality
        && !model.capabilities.inputModalities.includes(filter.inputModality)
      ) {
        return false;
      }

      if (
        filter.outputModality
        && !model.capabilities.outputModalities.includes(filter.outputModality)
      ) {
        return false;
      }

      if (filter.providerId) {
        return this.listEndpoints({
          providerId: filter.providerId,
          modelId: model.id,
          enabled: true,
        }).length > 0;
      }

      return true;
    });
  }

  listEndpoints(filter?: IAiModelEndpointFilter): readonly IAiModelEndpoint[] {
    const endpoints = [...this.endpoints.values()];

    if (!filter) {
      return endpoints;
    }

    return endpoints.filter((endpoint) => {
      if (filter.providerId && endpoint.providerId !== filter.providerId) return false;
      if (filter.modelId && endpoint.modelId !== filter.modelId) return false;
      if (filter.protocol && endpoint.protocol !== filter.protocol) return false;
      if (filter.enabled !== undefined && endpoint.enabled !== filter.enabled) return false;
      if (filter.deprecated !== undefined && endpoint.deprecated !== filter.deprecated) return false;
      return true;
    });
  }

  getProvider(id: string): IAiProvider | undefined {
    return this.providers.get(id);
  }

  getModel(id: string): IAiModel | undefined {
    return this.models.get(id);
  }

  getEndpoint(id: string): IAiModelEndpoint | undefined {
    return this.endpoints.get(id);
  }

  requireProvider(id: string): IAiProvider {
    const provider = this.getProvider(id);
    if (!provider) {
      throw new AiError(`AI catalogue provider '${id}' is not registered.`);
    }

    return provider;
  }

  requireModel(id: string): IAiModel {
    const model = this.getModel(id);
    if (!model) {
      throw new AiError(`AI model '${id}' is not registered.`);
    }

    return model;
  }

  requireEndpoint(id: string): IAiModelEndpoint {
    const endpoint = this.getEndpoint(id);
    if (!endpoint) {
      throw new AiError(`AI model endpoint '${id}' is not registered.`);
    }

    return endpoint;
  }

  listEndpointsForModel(modelId: string): readonly IAiModelEndpoint[] {
    return this.listEndpoints({ modelId });
  }

  listEndpointsForProvider(providerId: string): readonly IAiModelEndpoint[] {
    return this.listEndpoints({ providerId });
  }

  listChatModels(): readonly IAiModel[] {
    return this.listModels({ chat: true });
  }

  listEmbeddingModels(): readonly IAiModel[] {
    return this.listModels({ embeddings: true });
  }

  listToolCapableModels(): readonly IAiModel[] {
    return this.listModels({ tools: true });
  }

  listReasoningModels(): readonly IAiModel[] {
    return this.listModels({ reasoning: true });
  }
}
