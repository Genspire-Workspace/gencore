// file: packages\ai\src\prompts\ai-prompt.ts

import type { IAiMessage } from "../common/ai-message.js";

export type AiPromptTemplate = string | readonly IAiMessage[];

export interface IAiPromptVariable {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface IAiPromptRenderInput {
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  keepUnresolvedPlaceholders?: boolean;
}

export interface IAiRenderedPrompt {
  messages: IAiMessage[];
  metadata?: Record<string, unknown>;
}

export interface IAiPrompt {
  id: string;
  name?: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  variables?: readonly IAiPromptVariable[];
  template: AiPromptTemplate;
  metadata?: Record<string, unknown>;
}
