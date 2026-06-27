// file: packages/ai/src/application/agents/agent.ts

import type { AiContext } from "../context/ai-context.js";
import type { AiGenerationService } from "../services/ai-generation-service.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import type {
  IAiAgentLoopOptions,
  IAiAgentLoopResult,
  IAiAgentResumeState,
} from "../../domain/agents/agent-types.js";
import type { IAiToolResult } from "../../domain/tools/ai-tool-result.js";
import { AiAgentLoop } from "./agent-loop.js";

/**
 * Agent entry point. Mirrors {@link AiGenerationService}'s role but owns a
 * tool set and produces agent loops. Build one per configured
 * {@link AiGenerationService} and reuse across contexts.
 */
export class Agent {
  constructor(
    private readonly generationService: AiGenerationService,
    private readonly tools: readonly IAiTool[] = [],
  ) {}

  loop(options: IAiAgentLoopOptions = {}): AiAgentLoop {
    return new AiAgentLoop(this.generationService, {
      tools: this.tools,
      ...options,
    });
  }

  async run(
    context: AiContext,
    options: IAiAgentLoopOptions = {},
  ): Promise<IAiAgentLoopResult> {
    return this.loop(options).run(context);
  }

  async resume(
    resumeState: IAiAgentResumeState,
    toolResults: readonly IAiToolResult[],
    options: IAiAgentLoopOptions = {},
  ): Promise<IAiAgentLoopResult> {
    return this.loop(options).resume(resumeState, toolResults);
  }
}
