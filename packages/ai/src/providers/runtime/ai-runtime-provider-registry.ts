// file: packages\ai\src\providers\ai-provider-registry.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiRuntimeProvider } from "./ai-runtime-provider.js";

export class AiRuntimeProviderRegistry {
  private readonly providers = new Map<string, IAiRuntimeProvider>();

  register(provider: IAiRuntimeProvider): void {
    if (this.providers.has(provider.id)) {
      throw new AiError(`AI runtime provider '${provider.id}' is already registered.`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): IAiRuntimeProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new AiError(`AI runtime provider '${id}' is not registered.`);
    }
    return provider;
  }

  tryGet(id: string): IAiRuntimeProvider | null {
    return this.providers.get(id) ?? null;
  }

  list(): readonly IAiRuntimeProvider[] {
    return [...this.providers.values()];
  }
}
