// file: packages/ai/src/domain/prompts/index.ts

export type {
  AiPromptTemplate,
  IAiPrompt,
  IAiPromptRenderInput,
  IAiPromptVariable,
  IAiRenderedPrompt,
} from "./ai-prompt.js";
export type { IAiPromptFrontmatter } from "./ai-prompt-frontmatter.js";
export { defineAiPrompt } from "./define-ai-prompt.js";