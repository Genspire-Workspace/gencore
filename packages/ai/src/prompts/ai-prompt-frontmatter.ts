// file: packages\ai\src\prompts\ai-prompt-frontmatter.ts

import type { IAiPromptVariable } from "./ai-prompt.js";

export interface IAiPromptFrontmatter {
  id?: string;
  name?: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  variables?: readonly IAiPromptVariable[];
  metadata?: Record<string, unknown>;
}
