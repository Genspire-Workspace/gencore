// file: packages\ai\src\skills\define-ai-skill.ts

import { AiError } from "../errors/ai-error.js";
import type { IAiSkill, IAiSkillFile, IAiSkillSource } from "./ai-skill.js";
import { validateAiSkillSummary } from "./ai-skill-validator.js";

function normalizeSource(source: IAiSkillSource | undefined): IAiSkillSource | undefined {
  if (!source) {
    return undefined;
  }

  return {
    ...source,
    path: source.path?.trim(),
    packageName: source.packageName?.trim(),
  };
}

function normalizeFile(file: IAiSkillFile): IAiSkillFile {
  return {
    ...file,
    path: file.path.trim(),
    metadata: file.metadata ? { ...file.metadata } : undefined,
  };
}

export function defineAiSkill(skill: IAiSkill): IAiSkill {
  const normalizedAllowedTools = skill.allowedTools
    ?.map((tool) => tool.trim())
    .filter((tool) => tool.length > 0);
  const normalizedSkill: IAiSkill = {
    ...skill,
    name: skill.name.trim(),
    description: skill.description?.trim() ?? "",
    license: skill.license?.trim(),
    compatibility: skill.compatibility?.trim(),
    instructions: skill.instructions?.trim(),
    allowedTools: normalizedAllowedTools,
    source: normalizeSource(skill.source),
    files: skill.files?.map((file) => normalizeFile(file)),
  };
  const validation = validateAiSkillSummary(normalizedSkill, { strict: true });

  if (!validation.valid) {
    throw new AiError(validation.issues.map((issue) => issue.message).join(" "));
  }

  return normalizedSkill;
}
