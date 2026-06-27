// file: packages/ai/src/providers/ai-provider-client-registry.ts

import { AiError } from "../errors/ai-error.js";
import type { IAiProviderClient } from "./ai-provider-client.js";

export class AiProviderClientRegistry {
  private readonly clients = new Map<string, IAiProviderClient>();

  register(client: IAiProviderClient): void {
    if (this.clients.has(client.id)) {
      throw new AiError(`AI client '${client.id}' is already registered.`);
    }
    this.clients.set(client.id, client);
  }

  get(id: string): IAiProviderClient {
    const client = this.clients.get(id);
    if (!client) {
      throw new AiError(`AI client '${id}' is not registered.`);
    }
    return client;
  }

  tryGet(id: string): IAiProviderClient | null {
    return this.clients.get(id) ?? null;
  }

  list(): readonly IAiProviderClient[] {
    return [...this.clients.values()];
  }
}
