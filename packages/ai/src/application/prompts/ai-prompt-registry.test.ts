// file: packages/ai/src/application/prompts/ai-prompt-registry.test.ts

import { describe, expect, test } from "bun:test";
import { AiPromptRegistry } from "./ai-prompt-registry.js";
import type { IAiPrompt } from "../../domain/prompts/ai-prompt.js";

const createPrompt = (id: string, template = `Prompt ${id}`): IAiPrompt => ({
  id,
  template,
});

describe("AiPromptRegistry", () => {
  test("constructor registers initial prompts", () => {
    const registry = new AiPromptRegistry([createPrompt("capital-answer")]);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get("capital-answer").id).toBe("capital-answer");
  });

  test("register adds prompt", () => {
    const registry = new AiPromptRegistry();
    registry.register(createPrompt("capital-answer"));

    expect(registry.has("capital-answer")).toBe(true);
  });

  test("register rejects duplicate", () => {
    const registry = new AiPromptRegistry([createPrompt("capital-answer")]);

    expect(() => registry.register(createPrompt("capital-answer"))).toThrow(
      "AI prompt 'capital-answer' is already registered.",
    );
  });

  test("upsert replaces", () => {
    const registry = new AiPromptRegistry([
      createPrompt("capital-answer", "Old"),
    ]);
    registry.upsert(createPrompt("capital-answer", "New"));

    expect(registry.get("capital-answer").template).toBe("New");
  });

  test("unregister removes prompt", () => {
    const registry = new AiPromptRegistry([createPrompt("capital-answer")]);
    registry.unregister("capital-answer");

    expect(registry.has("capital-answer")).toBe(false);
  });

  test("get throws when missing", () => {
    const registry = new AiPromptRegistry();

    expect(() => registry.get("missing")).toThrow(
      "AI prompt 'missing' is not registered.",
    );
  });

  test("list returns prompts", () => {
    const registry = new AiPromptRegistry([
      createPrompt("capital-answer"),
      createPrompt("country-answer"),
    ]);

    expect(registry.list().map((prompt) => prompt.id)).toEqual([
      "capital-answer",
      "country-answer",
    ]);
  });

  test("clear removes all", () => {
    const registry = new AiPromptRegistry([
      createPrompt("capital-answer"),
      createPrompt("country-answer"),
    ]);
    registry.clear();

    expect(registry.list()).toEqual([]);
  });
});
