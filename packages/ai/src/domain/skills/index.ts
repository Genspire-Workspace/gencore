// file: packages/ai/src/domain/skills/index.ts

export type {
  AiSkillSourceKind,
  IAiSkill,
  IAiSkillFile,
  IAiSkillSource,
  IAiSkillSummary,
} from "./ai-skill.js";
export type { IAiSkillFrontmatter } from "./ai-skill-frontmatter.js";
export { defineAiSkill } from "./define-ai-skill.js";