// file: packages/ai/src/application/model-transforms/deepseek.ts

import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IModelTransformResult } from "../../domain/generation/ai-model-transforms.js";

/**
 * DeepSeek v4 models use a two-field thinking system:
 *
 *   {"thinking": {"type": "enabled" | "disabled"}}   toggle
 *   {"reasoning_effort": "high" | "max"}             effort (only when enabled)
 *
 * Effort mapping per API docs:
 *   none/minimal   thinking disabled
 *   low/medium     thinking enabled, reasoning_effort = "high" (compat mapping)
 *   high           thinking enabled, reasoning_effort = "high"
 *   xhigh/max      thinking enabled, reasoning_effort = "max"
 */
export function deepseekTransform(
  request: IChatGenerationRequest,
): IModelTransformResult | undefined {
  const effort = request.settings?.reasoningEffort;
  if (!effort) return undefined;

  if (effort === "none" || effort === "minimal") {
    return {
      providerOptions: {
        thinking: { type: "disabled" as const },
      },
    };
  }

  const reasoningEffort: string =
    effort === "xhigh" ? "max" : "high";

  return {
    providerOptions: {
      thinking: { type: "enabled" as const },
      reasoningEffort,
    },
  };
}
