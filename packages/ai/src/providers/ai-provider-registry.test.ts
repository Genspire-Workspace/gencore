// file: packages\ai\src\providers\ai-provider-registry.test.ts

import { describe, expect, test, beforeEach } from "bun:test";
import { AiProviderRegistry } from "./ai-provider-registry.js";
import type { IAiProvider } from "./ai-provider.js";

function createMockProvider(id: string): IAiProvider {
  return {
    id,
    displayName: `Mock ${id}`,
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return true;
    },
    chat: {
      async generateChatCompletion() {
        throw new Error("not implemented");
      },
      streamChatCompletion() {
        throw new Error("not implemented");
      },
    },
  };
}

describe("AiProviderRegistry", () => {
  let registry: AiProviderRegistry;

  beforeEach(() => {
    registry = new AiProviderRegistry();
  });

  test("registers provider", () => {
    const provider = createMockProvider("openai");
    registry.register(provider);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]!.id).toBe("openai");
  });

  test("rejects duplicate provider ID", () => {
    registry.register(createMockProvider("openai"));
    expect(() => registry.register(createMockProvider("openai"))).toThrow(
      "AI provider 'openai' is already registered.",
    );
  });

  test("gets provider by ID", () => {
    const provider = createMockProvider("openai");
    registry.register(provider);
    const found = registry.get("openai");
    expect(found).toBe(provider);
  });

  test("returns null from tryGet for missing provider", () => {
    const result = registry.tryGet("nonexistent");
    expect(result).toBeNull();
  });

  test("throws from get for missing provider", () => {
    expect(() => registry.get("nonexistent")).toThrow(
      "AI provider 'nonexistent' is not registered.",
    );
  });

  test("list returns all registered providers", () => {
    registry.register(createMockProvider("a"));
    registry.register(createMockProvider("b"));
    expect(registry.list()).toHaveLength(2);
  });
});
