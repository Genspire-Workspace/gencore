// file: packages/ai/src/errors/ai-error.ts

import { GenError } from "@genspire/core";

export class AiError extends GenError {
  constructor(
    message: string,
    options?: { code?: string; details?: Record<string, unknown> },
  ) {
    super(message, options?.code ?? "AI_ERROR", options?.details);
  }
}
