// file: packages\ai\src\clients\ai-client-registry.ts

import { AiError } from "../errors/ai-error.js";
import type { IAiClient } from "./ai-client.js";

export class AiClientRegistry {
  private readonly clients = new Map<string, IAiClient>();

  register(client: IAiClient): void {
    if (this.clients.has(client.id)) {
      throw new AiError(`AI client '${client.id}' is already registered.`);
    }
    this.clients.set(client.id, client);
  }

  get(id: string): IAiClient {
    const client = this.clients.get(id);
    if (!client) {
      throw new AiError(`AI client '${id}' is not registered.`);
    }
    return client;
  }

  tryGet(id: string): IAiClient | null {
    return this.clients.get(id) ?? null;
  }

  list(): readonly IAiClient[] {
    return [...this.clients.values()];
  }
}
