// file: packages\ai\src\skills\ai-skill.ts

import type { IAiPrompt } from "../prompts/ai-prompt.js";
import type { IAiTool } from "../tools/ai-tool.js";

export type AiSkillSourceKind =
  | "global"
  | "project"
  | "package"
  | "settings"
  | "cli"
  | "memory"
  | "custom";

export interface IAiSkillSource {
  kind: AiSkillSourceKind;
  path?: string;
  packageName?: string;
  trusted?: boolean;
  priority?: number;
}

export interface IAiSkillFile {
  path: string;
  kind?:
    | "instruction"
    | "reference"
    | "script"
    | "asset"
    | "prompt"
    | "tool"
    | "other";
  metadata?: Record<string, unknown>;
}

export interface IAiSkillSummary {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  allowedTools?: readonly string[];
  disableModelInvocation?: boolean;
  source?: IAiSkillSource;
}

export interface IAiSkill extends IAiSkillSummary {
  instructions?: string;
  prompts?: readonly IAiPrompt[];
  tools?: readonly IAiTool[];
  files?: readonly IAiSkillFile[];
}
