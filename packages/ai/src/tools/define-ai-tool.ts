// file: packages\ai\src\tools\define-ai-tool.ts

import { AiError } from "../errors/ai-error.js";
import type { IAiTool } from "./ai-tool.js";

export function defineAiTool<TArgs = unknown, TResult = unknown>(
  tool: IAiTool<TArgs, TResult>,
): IAiTool<TArgs, TResult> {
  const name = tool.name.trim();

  if (!name) {
    throw new AiError("AI tool name is required.");
  }

  if (!tool.description?.trim()) {
    throw new AiError(`AI tool '${name}' requires a description.`);
  }

  return {
    ...tool,
    name,
    description: tool.description.trim(),
  };
}
