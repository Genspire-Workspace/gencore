// file: packages/ai/src/application/skills/ai-skill-validator.ts

import type { IAiSkillSummary } from "../../domain/skills/ai-skill.js";

export type AiSkillValidationSeverity = "warning" | "error";

export interface IAiSkillValidationIssue {
  code: string;
  severity: AiSkillValidationSeverity;
  message: string;
}

export interface IAiSkillValidationResult {
  valid: boolean;
  issues: IAiSkillValidationIssue[];
}

export interface IAiSkillValidationOptions {
  strict?: boolean;
}

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createIssue(
  code: string,
  strict: boolean,
  message: string,
): IAiSkillValidationIssue {
  return {
    code,
    severity: strict ? "error" : "warning",
    message,
  };
}

export function validateAiSkillSummary(
  summary: IAiSkillSummary,
  options?: IAiSkillValidationOptions,
): IAiSkillValidationResult {
  const strict = options?.strict ?? false;
  const issues: IAiSkillValidationIssue[] = [];
  const name = summary.name?.trim() ?? "";
  const description = summary.description?.trim() ?? "";

  if (!name) {
    issues.push({
      code: "skill_name_required",
      severity: "error",
      message: "AI skill name is required.",
    });
  }

  if (!description) {
    issues.push({
      code: "skill_description_required",
      severity: "error",
      message: "AI skill description is required.",
    });
  }

  if (name && name.length > MAX_NAME_LENGTH) {
    issues.push(
      createIssue(
        "skill_name_too_long",
        strict,
        `AI skill name must be at most ${MAX_NAME_LENGTH} characters.`,
      ),
    );
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    issues.push(
      createIssue(
        "skill_description_too_long",
        strict,
        `AI skill description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
      ),
    );
  }

  if (name) {
    if (name.startsWith("-")) {
      issues.push(
        createIssue(
          "skill_name_leading_hyphen",
          strict,
          "AI skill name cannot start with a hyphen.",
        ),
      );
    }

    if (name.endsWith("-")) {
      issues.push(
        createIssue(
          "skill_name_trailing_hyphen",
          strict,
          "AI skill name cannot end with a hyphen.",
        ),
      );
    }

    if (name.includes("--")) {
      issues.push(
        createIssue(
          "skill_name_consecutive_hyphens",
          strict,
          "AI skill name cannot contain consecutive hyphens.",
        ),
      );
    }

    if (!NAME_PATTERN.test(name)) {
      issues.push(
        createIssue(
          "skill_name_invalid_format",
          strict,
          "AI skill name must use lowercase letters, numbers, and single hyphens only.",
        ),
      );
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}
