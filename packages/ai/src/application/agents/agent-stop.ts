// file: packages/ai/src/application/agents/agent-stop.ts

import type { IAiAgentStopCondition } from "../../domain/agents/agent-types.js";

/**
 * Stop condition that fires once the loop has run at least `maxSteps` steps.
 * Mirrors the Vercel AI SDK `isStepCount` helper.
 */
export function stepCountIs(maxSteps: number): IAiAgentStopCondition {
  return (state) => state.stepCount >= maxSteps;
}