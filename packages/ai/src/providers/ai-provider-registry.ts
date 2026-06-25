// file: packages\ai\src\providers\ai-provider-registry.ts

import type { IAiProvider } from "./ai-provider.js";
import { AiError } from "../errors/ai-error.js";

export class AiProviderRegistry {
  private readonly providers = new Map<string, IAiProvider>();

  register(provider: IAiProvider): void {
    if (this.providers.has(provider.id)) {
      throw new AiError(`AI provider '${provider.id}' is already registered.`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): IAiProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new AiError(`AI provider '${id}' is not registered.`);
    }
    return provider;
  }

  tryGet(id: string): IAiProvider | null {
    return this.providers.get(id) ?? null;
  }

  list(): readonly IAiProvider[] {
    return [...this.providers.values()];
  }
}
