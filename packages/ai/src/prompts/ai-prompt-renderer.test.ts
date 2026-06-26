// file: packages\ai\src\prompts\ai-prompt-renderer.test.ts

import { describe, expect, test } from "bun:test";
import { AiPromptRenderer } from "./ai-prompt-renderer.js";
import { defineAiPrompt } from "./define-ai-prompt.js";

describe("AiPromptRenderer", () => {
  test("renders string template into user message", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: "What is the capital of {{country}}?",
      variables: [{ name: "country", required: true }],
    });

    const renderer = new AiPromptRenderer();
    const rendered = renderer.render(prompt, {
      variables: { country: "Portugal" },
    });

    expect(rendered.messages).toEqual([
      {
        role: "user",
        content: "What is the capital of Portugal?",
      },
    ]);
  });

  test("renders message template", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: [
        {
          role: "system",
          content: [{ type: "text", text: "You answer about {{topic}}." }],
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Find the capital of {{country}}." },
            { type: "thinking", text: "Need {{topic}} context." },
            {
              type: "tool_result",
              toolCallId: "call_1",
              content: "Result for {{country}}",
            },
          ],
        },
      ],
      variables: [
        { name: "country", required: true },
        { name: "topic", defaultValue: "geography" },
      ],
    });

    const renderer = new AiPromptRenderer();
    const rendered = renderer.render(prompt, {
      variables: { country: "Japan" },
    });

    expect(rendered.messages).toEqual([
      {
        role: "system",
        content: [{ type: "text", text: "You answer about geography." }],
        name: undefined,
        metadata: undefined,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Find the capital of Japan." },
          { type: "thinking", text: "Need geography context." },
          {
            type: "tool_result",
            toolCallId: "call_1",
            content: "Result for Japan",
          },
        ],
        name: undefined,
        metadata: undefined,
      },
    ]);
  });

  test("applies default variable values", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: "Find the capital of {{country}}.",
      variables: [{ name: "country", defaultValue: "France" }],
    });

    const renderer = new AiPromptRenderer();
    const rendered = renderer.render(prompt);

    expect(rendered.messages[0]?.content).toBe("Find the capital of France.");
  });

  test("throws on missing required variable", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: "Find the capital of {{country}}.",
      variables: [{ name: "country", required: true }],
    });

    const renderer = new AiPromptRenderer();

    expect(() => renderer.render(prompt)).toThrow(
      "AI prompt 'capital-answer' is missing required variable 'country'.",
    );
  });

  test("throws on unresolved placeholder", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: "Find the capital of {{country}}.",
    });

    const renderer = new AiPromptRenderer();

    expect(() => renderer.render(prompt)).toThrow(
      "AI prompt 'capital-answer' could not resolve variable 'country'.",
    );
  });

  test("keeps unresolved placeholders when keepUnresolvedPlaceholders is set", () => {
    const prompt = defineAiPrompt({
      id: "directory-task",
      template:
        "Work only inside {{targetDirectory}}. Find images and {{expectedAiFile}}.",
      variables: [
        { name: "targetDirectory", required: true },
        { name: "expectedAiFile", required: true },
      ],
    });

    const renderer = new AiPromptRenderer();
    const rendered = renderer.render(prompt, {
      keepUnresolvedPlaceholders: true,
    });

    expect(rendered.messages[0]?.content).toBe(
      "Work only inside {{targetDirectory}}. Find images and {{expectedAiFile}}.",
    );
  });

  test("keeps placeholders for undeclared variables when keepUnresolvedPlaceholders is set", () => {
    const prompt = defineAiPrompt({
      id: "free-form",
      template: "Summarize {{topic}} for {{audience}}.",
    });

    const renderer = new AiPromptRenderer();
    const rendered = renderer.render(prompt, {
      keepUnresolvedPlaceholders: true,
    });

    expect(rendered.messages[0]?.content).toBe(
      "Summarize {{topic}} for {{audience}}.",
    );
  });
});
