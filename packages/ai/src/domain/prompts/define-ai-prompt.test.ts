// file: packages/ai/src/domain/prompts/define-ai-prompt.test.ts

import { describe, expect, test } from "bun:test";
import { defineAiPrompt } from "./define-ai-prompt.js";

describe("defineAiPrompt", () => {
  test("trims id, name, and description", () => {
    const prompt = defineAiPrompt({
      id: "  capital-answer  ",
      type: "user_prompt",
      name: "  Capital Answer  ",
      description: "  Finds a capital city.  ",
      template: "What is the capital of {{country}}?",
    });

    expect(prompt.id).toBe("capital-answer");
    expect(prompt.name).toBe("Capital Answer");
    expect(prompt.description).toBe("Finds a capital city.");
  });

  test("rejects blank id", () => {
    expect(() =>
      defineAiPrompt({
        id: "   ",
        type: "user_prompt",
        template: "Prompt",
      })).toThrow("AI prompt id is required.");
  });

  test("rejects blank variable names", () => {
    expect(() =>
      defineAiPrompt({
        id: "capital-answer",
        type: "user_prompt",
        template: "Prompt",
        variables: [{ name: "   " }],
      })).toThrow("AI prompt 'capital-answer' has a variable with no name.");
  });

  test("rejects duplicate variables", () => {
    expect(() =>
      defineAiPrompt({
        id: "capital-answer",
        type: "user_prompt",
        template: "Prompt",
        variables: [{ name: "country" }, { name: "country" }],
      })).toThrow(
        "AI prompt 'capital-answer' has a duplicate variable 'country'.",
      );
  });

  test("rejects blank prompt type", () => {
    expect(() =>
      defineAiPrompt({
        id: "capital-answer",
        type: "   ",
        template: "Prompt",
      })).toThrow("AI prompt 'capital-answer' must define a prompt type.");
  });
});
