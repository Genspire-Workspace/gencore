// file: packages\ai\src\skills\define-ai-skill.test.ts

import { describe, expect, test } from "bun:test";
import { defineAiPrompt } from "../prompts/define-ai-prompt.js";
import { defineAiTool } from "../tools/define-ai-tool.js";
import { defineAiSkill } from "./define-ai-skill.js";

describe("defineAiSkill", () => {
  test("normalizes fields", () => {
    const skill = defineAiSkill({
      name: "  capital-lookup  ",
      description: "  Looks up capital cities.  ",
      license: "  MIT  ",
      compatibility: "  >=1.0  ",
      instructions: "  Use the tool.  ",
    });

    expect(skill.name).toBe("capital-lookup");
    expect(skill.description).toBe("Looks up capital cities.");
    expect(skill.license).toBe("MIT");
    expect(skill.compatibility).toBe(">=1.0");
    expect(skill.instructions).toBe("Use the tool.");
  });

  test("rejects invalid strict skill", () => {
    expect(() =>
      defineAiSkill({
        name: "CapitalLookup",
        description: "Looks up capital cities.",
      })).toThrow(
        "AI skill name must use lowercase letters, numbers, and single hyphens only.",
      );
  });

  test("normalizes allowed tools", () => {
    const skill = defineAiSkill({
      name: "capital-lookup",
      description: "Looks up capital cities.",
      allowedTools: ["  get_capital  ", "   ", "  get_country  "],
    });

    expect(skill.allowedTools).toEqual(["get_capital", "get_country"]);
  });

  test("can bundle a prompt and a tool", () => {
    const prompt = defineAiPrompt({
      id: "capital-answer",
      template: [
        {
          role: "system",
          content: "You answer using tools when needed.",
        },
        {
          role: "user",
          content: "Find the capital of {{country}}.",
        },
      ],
      variables: [{ name: "country", required: true }],
    });
    const getCapitalTool = defineAiTool({
      name: "get_capital",
      description: "Gets the capital for a country.",
    });
    const skill = defineAiSkill({
      name: "capital-lookup",
      description: "Looks up capital cities. Use when a task asks for a country capital.",
      instructions: "Use the get_capital tool when a country capital is requested.",
      prompts: [prompt],
      tools: [getCapitalTool],
    });

    expect(skill.prompts).toEqual([prompt]);
    expect(skill.tools).toEqual([getCapitalTool]);
  });
});
