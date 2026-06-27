// file: packages/ai/src/providers/ai-provider-client-registry.test.ts

import { describe, expect, test, beforeEach } from "bun:test";
import { AiProviderClientRegistry } from "./ai-provider-client-registry.js";
import type { IAiProviderClient } from "./ai-provider-client.js";

function createMockClient(id: string): IAiProviderClient {
  return {
    id,
    name: `Mock ${id}`,
    kind: "custom",
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return true;
    },
    chat: {
      async generateChat() {
        throw new Error("not implemented");
      },
      streamChat() {
        throw new Error("not implemented");
      },
    },
  };
}

describe("AiClientRegistry", () => {
  let registry: AiProviderClientRegistry;

  beforeEach(() => {
    registry = new AiProviderClientRegistry();
  });

  test("registers client", () => {
    const client = createMockClient("openai");
    registry.register(client);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]!.id).toBe("openai");
  });

  test("rejects duplicate client ID", () => {
    registry.register(createMockClient("openai"));
    expect(() => registry.register(createMockClient("openai"))).toThrow(
      "AI client 'openai' is already registered.",
    );
  });

  test("gets client by ID", () => {
    const client = createMockClient("openai");
    registry.register(client);
    const found = registry.get("openai");
    expect(found).toBe(client);
  });

  test("returns null from tryGet for missing client", () => {
    const result = registry.tryGet("nonexistent");
    expect(result).toBeNull();
  });

  test("throws from get for missing provider", () => {
    expect(() => registry.get("nonexistent")).toThrow(
      "AI client 'nonexistent' is not registered.",
    );
  });

  test("list returns all registered clients", () => {
    registry.register(createMockClient("a"));
    registry.register(createMockClient("b"));
    expect(registry.list()).toHaveLength(2);
  });
});
