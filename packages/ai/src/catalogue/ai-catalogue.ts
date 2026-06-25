// file: packages\ai\src\catalogue\ai-catalogue.ts

import type { IAiLab } from "../common/ai-lab.js";
import type { IAiModel } from "../common/ai-model.js";
import type { IAiProvider } from "../common/ai-provider.js";

export interface IAiCatalogueData {
  providers: Record<string, IAiProvider>;
  models: Record<string, IAiModel>;
  labs: Record<string, IAiLab>;
}

export interface IAiModelFilter {
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  attachment?: boolean;
  open_weights?: boolean;
  input?: string;
  output?: string;
  family?: string;
}

export interface IAiProviderFilter {
  clientKind?: string;
  npm?: string;
  kind?: string;
}

export class AiCatalogue {
  constructor(private readonly data: IAiCatalogueData) {}

  get providers(): Record<string, IAiProvider> {
    return this.data.providers;
  }

  get models(): Record<string, IAiModel> {
    return this.data.models;
  }

  get labs(): Record<string, IAiLab> {
    return this.data.labs;
  }

  getProvider(id: string): IAiProvider | undefined {
    return this.data.providers[id];
  }

  getModel(id: string): IAiModel | undefined {
    return this.data.models[id];
  }

  getLab(id: string): IAiLab | undefined {
    return this.data.labs[id];
  }

  listProviders(filter?: IAiProviderFilter): IAiProvider[] {
    const providers = Object.values(this.data.providers);

    if (!filter) {
      return providers;
    }

    return providers.filter((provider) => {
      if (filter.clientKind && provider.clientKind !== filter.clientKind) return false;
      if (filter.npm && provider.npm !== filter.npm) return false;
      if (filter.kind && provider.kind !== filter.kind) return false;
      return true;
    });
  }

  listModels(filter?: IAiModelFilter): IAiModel[] {
    const models = Object.values(this.data.models);

    if (!filter) {
      return models;
    }

    return models.filter((model) => {
      if (filter.reasoning !== undefined && model.reasoning !== filter.reasoning) return false;
      if (filter.tool_call !== undefined && model.tool_call !== filter.tool_call) return false;
      if (filter.structured_output !== undefined && model.structured_output !== filter.structured_output) return false;
      if (filter.attachment !== undefined && model.attachment !== filter.attachment) return false;
      if (filter.open_weights !== undefined && model.open_weights !== filter.open_weights) return false;
      if (filter.family && model.family !== filter.family) return false;
      if (filter.input && !model.modalities.input.includes(filter.input as never)) return false;
      if (filter.output && !model.modalities.output.includes(filter.output as never)) return false;
      return true;
    });
  }

  listLabs(): IAiLab[] {
    return Object.values(this.data.labs);
  }
}
