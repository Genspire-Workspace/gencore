// file: packages/ai/src/application/skills/ai-skill-validator.test.ts

import { describe, expect, test } from "bun:test";
import { validateAiSkillSummary } from "./ai-skill-validator.js";

describe("validateAiSkillSummary", () => {
  test("accepts valid skill name", () => {
    const result = validateAiSkillSummary({
      name: "capital-lookup",
      description: "Looks up capital cities.",
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("warns and errors on uppercase", () => {
    const warningResult = validateAiSkillSummary({
      name: "Capital-lookup",
      description: "Looks up capital cities.",
    });
    const errorResult = validateAiSkillSummary(
      {
        name: "Capital-lookup",
        description: "Looks up capital cities.",
      },
      { strict: true },
    );

    expect(warningResult.issues[0]?.severity).toBe("warning");
    expect(errorResult.issues[0]?.severity).toBe("error");
  });

  test("warns and errors on leading hyphen", () => {
    const warningResult = validateAiSkillSummary({
      name: "-capital-lookup",
      description: "Looks up capital cities.",
    });
    const errorResult = validateAiSkillSummary(
      {
        name: "-capital-lookup",
        description: "Looks up capital cities.",
      },
      { strict: true },
    );

    expect(warningResult.issues.some((issue) => issue.code === "skill_name_leading_hyphen")).toBe(true);
    expect(errorResult.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  test("warns and errors on trailing hyphen", () => {
    const warningResult = validateAiSkillSummary({
      name: "capital-lookup-",
      description: "Looks up capital cities.",
    });
    const errorResult = validateAiSkillSummary(
      {
        name: "capital-lookup-",
        description: "Looks up capital cities.",
      },
      { strict: true },
    );

    expect(warningResult.issues.some((issue) => issue.code === "skill_name_trailing_hyphen")).toBe(true);
    expect(errorResult.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  test("warns and errors on consecutive hyphen", () => {
    const warningResult = validateAiSkillSummary({
      name: "capital--lookup",
      description: "Looks up capital cities.",
    });
    const errorResult = validateAiSkillSummary(
      {
        name: "capital--lookup",
        description: "Looks up capital cities.",
      },
      { strict: true },
    );

    expect(warningResult.issues.some((issue) => issue.code === "skill_name_consecutive_hyphens")).toBe(true);
    expect(errorResult.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  test("warns and errors when name exceeds 64 chars", () => {
    const name = "a".repeat(65);
    const warningResult = validateAiSkillSummary({
      name,
      description: "Looks up capital cities.",
    });
    const errorResult = validateAiSkillSummary(
      {
        name,
        description: "Looks up capital cities.",
      },
      { strict: true },
    );

    expect(warningResult.issues.some((issue) => issue.code === "skill_name_too_long")).toBe(true);
    expect(errorResult.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  test("errors when description missing", () => {
    const result = validateAiSkillSummary({
      name: "capital-lookup",
      description: "",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "skill_description_required",
      severity: "error",
      message: "AI skill description is required.",
    });
  });

  test("warns and errors when description exceeds 1024 chars", () => {
    const description = "a".repeat(1025);
    const warningResult = validateAiSkillSummary({
      name: "capital-lookup",
      description,
    });
    const errorResult = validateAiSkillSummary(
      {
        name: "capital-lookup",
        description,
      },
      { strict: true },
    );

    expect(warningResult.issues.some((issue) => issue.code === "skill_description_too_long")).toBe(true);
    expect(errorResult.issues.some((issue) => issue.severity === "error")).toBe(true);
  });
});
