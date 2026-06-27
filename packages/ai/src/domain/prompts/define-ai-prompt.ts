// file: packages/ai/src/domain/prompts/define-ai-prompt.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiPrompt, IAiPromptVariable } from "./ai-prompt.js";

function normalizeVariable(
  variable: IAiPromptVariable,
  promptId: string,
): IAiPromptVariable {
  const name = variable.name.trim();

  if (!name) {
    throw new AiError(`AI prompt '${promptId}' has a variable with no name.`);
  }

  return {
    ...variable,
    name,
    description: variable.description?.trim(),
  };
}

export function defineAiPrompt(prompt: IAiPrompt): IAiPrompt {
  const id = prompt.id.trim();

  if (!id) {
    throw new AiError("AI prompt id is required.");
  }

  const variables = prompt.variables?.map((variable) =>
    normalizeVariable(variable, id)
  );
  const variableNames = new Set<string>();

  for (const variable of variables ?? []) {
    if (variableNames.has(variable.name)) {
      throw new AiError(
        `AI prompt '${id}' has a duplicate variable '${variable.name}'.`,
      );
    }

    variableNames.add(variable.name);
  }

  return {
    ...prompt,
    id,
    name: prompt.name?.trim(),
    description: prompt.description?.trim(),
    argumentHint: prompt.argumentHint?.trim(),
    variables,
  };
}
