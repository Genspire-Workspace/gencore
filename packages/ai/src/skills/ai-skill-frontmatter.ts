// file: packages\ai\src\skills\ai-skill-frontmatter.ts

export interface IAiSkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  allowedTools?: readonly string[];
  disableModelInvocation?: boolean;
}
