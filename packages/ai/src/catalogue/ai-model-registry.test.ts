import { describe, expect, test } from "bun:test";
import { AiModelRegistry } from "./ai-model-registry.js";
import { AI_MODEL_ENDPOINTS, AI_MODELS, AI_PROVIDERS } from "./generated/index.js";

describe("AiModelRegistry", () => {
  const registry = new AiModelRegistry({
    providers: AI_PROVIDERS,
    models: AI_MODELS,
    endpoints: AI_MODEL_ENDPOINTS,
  });

  test("lists providers, models, and endpoints", () => {
    expect(registry.listProviders()).toHaveLength(4);
    expect(registry.listModels()).toHaveLength(3);
    expect(registry.listEndpoints()).toHaveLength(4);
  });

  test("gets provider, model, and endpoint by id", () => {
    expect(registry.getProvider("openai")?.displayName).toBe("OpenAI");
    expect(registry.getModel("openai/gpt-4.1")?.displayName).toBe("GPT-4.1");
    expect(registry.getEndpoint("openrouter:anthropic/claude-sonnet-4")?.providerId).toBe("openrouter");
  });

  test("require methods throw for missing ids", () => {
    expect(() => registry.requireProvider("missing")).toThrow(
      "AI catalogue provider 'missing' is not registered.",
    );
    expect(() => registry.requireModel("missing")).toThrow(
      "AI model 'missing' is not registered.",
    );
    expect(() => registry.requireEndpoint("missing")).toThrow(
      "AI model endpoint 'missing' is not registered.",
    );
  });

  test("listChatModels returns only chat models", () => {
    expect(registry.listChatModels().map((model) => model.id)).toEqual([
      "openai/gpt-4.1",
      "anthropic/claude-sonnet-4",
    ]);
  });

  test("listEmbeddingModels returns only embedding models", () => {
    expect(registry.listEmbeddingModels().map((model) => model.id)).toEqual([
      "openai/text-embedding-3-small",
    ]);
  });

  test("listToolCapableModels returns only tool-capable models", () => {
    expect(registry.listToolCapableModels().map((model) => model.id)).toEqual([
      "openai/gpt-4.1",
      "anthropic/claude-sonnet-4",
    ]);
  });

  test("listReasoningModels returns only reasoning models", () => {
    expect(registry.listReasoningModels().map((model) => model.id)).toEqual([
      "anthropic/claude-sonnet-4",
    ]);
  });

  test("listEndpointsForModel works", () => {
    expect(
      registry.listEndpointsForModel("anthropic/claude-sonnet-4").map((endpoint) => endpoint.id),
    ).toEqual([
      "anthropic:anthropic/claude-sonnet-4",
      "openrouter:anthropic/claude-sonnet-4",
    ]);
  });

  test("listEndpointsForProvider works", () => {
    expect(
      registry.listEndpointsForProvider("openai").map((endpoint) => endpoint.id),
    ).toEqual([
      "openai:openai/gpt-4.1",
      "openai:openai/text-embedding-3-small",
    ]);
  });

  test("listModels filters by enabled serving provider", () => {
    expect(
      registry.listModels({ providerId: "openrouter" }).map((model) => model.id),
    ).toEqual([
      "anthropic/claude-sonnet-4",
    ]);
  });

  test("listModels filters by input modality", () => {
    expect(
      registry.listModels({ inputModality: "image" }).map((model) => model.id),
    ).toEqual([
      "openai/gpt-4.1",
      "anthropic/claude-sonnet-4",
    ]);
  });

  test("listModels filters by output modality", () => {
    expect(
      registry.listModels({ outputModality: "embedding" }).map((model) => model.id),
    ).toEqual([
      "openai/text-embedding-3-small",
    ]);
  });
});
