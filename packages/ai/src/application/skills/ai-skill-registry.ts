// file: packages/ai/src/application/skills/ai-skill-registry.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiSkillSummary } from "../../domain/skills/ai-skill.js";

export class AiSkillRegistry {
  private readonly skills = new Map<string, IAiSkillSummary>();

  constructor(skills?: readonly IAiSkillSummary[]) {
    for (const skill of skills ?? []) {
      this.register(skill);
    }
  }

  register(skill: IAiSkillSummary): void {
    if (this.skills.has(skill.name)) {
      throw new AiError(`AI skill '${skill.name}' is already registered.`);
    }

    this.skills.set(skill.name, skill);
  }

  upsert(skill: IAiSkillSummary): void {
    this.skills.set(skill.name, skill);
  }

  unregister(name: string): void {
    this.skills.delete(name);
  }

  get(name: string): IAiSkillSummary {
    const skill = this.skills.get(name);

    if (!skill) {
      throw new AiError(`AI skill '${name}' is not registered.`);
    }

    return skill;
  }

  tryGet(name: string): IAiSkillSummary | undefined {
    return this.skills.get(name);
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  list(): readonly IAiSkillSummary[] {
    return [...this.skills.values()];
  }

  clear(): void {
    this.skills.clear();
  }
}
