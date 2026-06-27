// file: packages/ai/src/application/skills/ai-skill-registry.test.ts

import { describe, expect, test } from "bun:test";
import { AiSkillRegistry } from "./ai-skill-registry.js";
import type { IAiSkillSummary } from "../../domain/skills/ai-skill.js";

const createSkill = (
  name: string,
  description = `Skill ${name}`,
): IAiSkillSummary => ({
  name,
  description,
});

describe("AiSkillRegistry", () => {
  test("constructor registers initial skills", () => {
    const registry = new AiSkillRegistry([createSkill("capital-lookup")]);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get("capital-lookup").name).toBe("capital-lookup");
  });

  test("register adds skill", () => {
    const registry = new AiSkillRegistry();
    registry.register(createSkill("capital-lookup"));

    expect(registry.has("capital-lookup")).toBe(true);
  });

  test("register rejects duplicate", () => {
    const registry = new AiSkillRegistry([createSkill("capital-lookup")]);

    expect(() => registry.register(createSkill("capital-lookup"))).toThrow(
      "AI skill 'capital-lookup' is already registered.",
    );
  });

  test("upsert replaces", () => {
    const registry = new AiSkillRegistry([createSkill("capital-lookup", "Old")]);
    registry.upsert(createSkill("capital-lookup", "New"));

    expect(registry.get("capital-lookup").description).toBe("New");
  });

  test("get throws when missing", () => {
    const registry = new AiSkillRegistry();

    expect(() => registry.get("missing")).toThrow(
      "AI skill 'missing' is not registered.",
    );
  });

  test("list returns skills", () => {
    const registry = new AiSkillRegistry([
      createSkill("capital-lookup"),
      createSkill("country-lookup"),
    ]);

    expect(registry.list().map((skill) => skill.name)).toEqual([
      "capital-lookup",
      "country-lookup",
    ]);
  });

  test("clear removes all", () => {
    const registry = new AiSkillRegistry([
      createSkill("capital-lookup"),
      createSkill("country-lookup"),
    ]);
    registry.clear();

    expect(registry.list()).toEqual([]);
  });
});
