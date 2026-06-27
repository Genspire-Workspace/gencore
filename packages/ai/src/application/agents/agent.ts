// file: packages/ai/src/application/agents/agent.ts

import { AiContext } from "../../domain/context/ai-context.js";
import type { AiGenerationService } from "../services/ai-generation-service.js";
import type {
  IAiAgentLoopOptions,
  IAiAgentLoopResult,
  IAiAgentResumeState,
} from "../../domain/agents/agent-types.js";
import type { IAiToolResult } from "../../domain/tools/ai-tool-result.js";
import { AiAgentLoop } from "./agent-loop.js";

/**
 * Agent entry point. Mirrors {@link AiGenerationService}'s role but owns an
 * {@link AiContext} and produces agent loops. Build one per configured
 * {@link AiGenerationService} and reuse across contexts.
 */
export class Agent {
  constructor(
    private readonly generationService: AiGenerationService,
    private readonly context: AiContext = AiContext.create(),
  ) {}

  loop(options: IAiAgentLoopOptions = {}): AiAgentLoop {
    return new AiAgentLoop(this.generationService, this.context, options);
  }

  async run(options: IAiAgentLoopOptions = {}): Promise<IAiAgentLoopResult> {
    return this.loop(options).run();
  }

  async resume(
    resumeState: IAiAgentResumeState,
    toolResults: readonly IAiToolResult[],
    options: IAiAgentLoopOptions = {},
  ): Promise<IAiAgentLoopResult> {
    return new AiAgentLoop(
      this.generationService,
      new AiContext(resumeState.context),
      options,
    ).resume(resumeState, toolResults);
  }
}
