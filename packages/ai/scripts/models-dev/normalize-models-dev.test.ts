import { describe, expect, test } from "bun:test";
import { normalizeModelRecord, normalizeModelsDev, normalizeProviderRecord } from "./normalize-models-dev.js";

describe("normalizeModelsDev", () => {
  test("normalizes provider metadata and derives routing fields", () => {
    const providers = normalizeProviderRecord({
      requesty: {
        id: "requesty",
        env: ["REQUESTY_API_KEY"],
        npm: "@ai-sdk/openai-compatible",
        api: "https://router.requesty.ai/v1",
        name: "Requesty",
        doc: "https://requesty.ai/solution/llm-routing/models",
      },
    });

    expect(providers.requesty).toMatchObject({
      id: "requesty",
      clientKind: "openai-compatible",
      kind: "gateway",
    });
  });

  test("normalizes model metadata without renaming snake_case fields", () => {
    const models = normalizeModelRecord({
      "z-ai/glm-5.1": {
        id: "z-ai/glm-5.1",
        name: "GLM-5.1",
        family: "glm",
        attachment: false,
        reasoning: true,
        tool_call: true,
        interleaved: {
          field: "reasoning_content",
        },
        structured_output: true,
        temperature: true,
        release_date: "2026-04-07",
        last_updated: "2026-04-07",
        modalities: {
          input: ["text"],
          output: ["text"],
        },
        open_weights: true,
        limit: {
          context: 200000,
          output: 131072,
        },
        cost: {
          input: 1.4,
          output: 4.4,
          cache_read: 0.26,
          cache_write: 0,
        },
      },
    });

    expect(models["z-ai/glm-5.1"]).toEqual({
      id: "z-ai/glm-5.1",
      name: "GLM-5.1",
      family: "glm",
      attachment: false,
      reasoning: true,
      tool_call: true,
      interleaved: {
        field: "reasoning_content",
      },
      structured_output: true,
      temperature: true,
      release_date: "2026-04-07",
      last_updated: "2026-04-07",
      modalities: {
        input: ["text"],
        output: ["text"],
      },
      open_weights: true,
      limit: {
        context: 200000,
        input: undefined,
        output: 131072,
      },
      cost: {
        input: 1.4,
        output: 4.4,
        cache_read: 0.26,
        cache_write: 0,
      },
      benchmarks: undefined,
      metadata: undefined,
      weights: undefined,
      knowledge: undefined,
    });
  });

  test("defaults missing modalities to text input/output", () => {
    const models = normalizeModelRecord({
      "test/model": {
        id: "test/model",
        name: "Test Model",
      },
    });

    expect(models["test/model"]?.modalities).toEqual({
      input: ["text"],
      output: ["text"],
    });
  });

  test("supports mixed source shapes and empty labs", () => {
    const catalogue = normalizeModelsDev({
      api: {
        providers: {
          openai: {
            id: "openai",
            name: "OpenAI",
            npm: "@ai-sdk/openai",
          },
        },
      },
      models: {
        models: {
          "openai/test": {
            id: "openai/test",
            name: "Test",
          },
        },
      },
    });

    expect(Object.keys(catalogue.providers)).toEqual(["openai"]);
    expect(Object.keys(catalogue.models)).toEqual(["openai/test"]);
    expect(catalogue.labs).toEqual({});
  });
});
