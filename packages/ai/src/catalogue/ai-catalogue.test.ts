import { describe, expect, test } from "bun:test";
import { AiCatalogue } from "./ai-catalogue.js";

const catalogue = new AiCatalogue({
  providers: {
    openai: {
      id: "openai",
      name: "OpenAI",
      clientKind: "openai",
      kind: "first-party",
      npm: "@ai-sdk/openai",
    },
    requesty: {
      id: "requesty",
      name: "Requesty",
      clientKind: "openai-compatible",
      kind: "gateway",
      npm: "@ai-sdk/openai-compatible",
    },
  },
  models: {
    "text/model": {
      id: "text/model",
      name: "Text Model",
      reasoning: true,
      tool_call: true,
      structured_output: true,
      open_weights: false,
      modalities: {
        input: ["text"],
        output: ["text"],
      },
    },
    "image/model": {
      id: "image/model",
      name: "Image Model",
      attachment: true,
      open_weights: true,
      modalities: {
        input: ["image"],
        output: ["text"],
      },
    },
  },
  labs: {
    sandbox: {
      id: "sandbox",
      name: "Sandbox",
      description: "Test lab",
    },
  },
});

describe("AiCatalogue", () => {
  test("getProvider", () => {
    expect(catalogue.getProvider("openai")?.name).toBe("OpenAI");
  });

  test("getModel", () => {
    expect(catalogue.getModel("text/model")?.name).toBe("Text Model");
  });

  test("getLab", () => {
    expect(catalogue.getLab("sandbox")?.name).toBe("Sandbox");
  });

  test("listProviders", () => {
    expect(catalogue.listProviders()).toHaveLength(2);
  });

  test("listProviders filters by clientKind", () => {
    expect(catalogue.listProviders({ clientKind: "openai-compatible" })).toHaveLength(1);
  });

  test("listModels filters by reasoning", () => {
    expect(catalogue.listModels({ reasoning: true }).map((model) => model.id)).toEqual(["text/model"]);
  });

  test("listModels filters by tool_call", () => {
    expect(catalogue.listModels({ tool_call: true }).map((model) => model.id)).toEqual(["text/model"]);
  });

  test("listModels filters by structured_output", () => {
    expect(catalogue.listModels({ structured_output: true }).map((model) => model.id)).toEqual(["text/model"]);
  });

  test("listModels filters by input modality", () => {
    expect(catalogue.listModels({ input: "image" }).map((model) => model.id)).toEqual(["image/model"]);
  });

  test("listModels filters by output modality", () => {
    expect(catalogue.listModels({ output: "text" })).toHaveLength(2);
  });
});
