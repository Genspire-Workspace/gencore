// file: packages\ai\src\tools\ai-tool-calling-manager.ts

import type { IAiTool } from "./ai-tool.js";
import type { IAiToolCall } from "./ai-tool-call.js";
import type { IAiToolResult } from "./ai-tool-result.js";
import { AiToolExecutor } from "./ai-tool-executor.js";
import type { AiToolExecutorContext } from "./ai-tool-executor.js";

export interface IAiToolCallingManagerInput extends AiToolExecutorContext {
  toolCalls: readonly IAiToolCall[];
  tools: readonly IAiTool[];
}

export interface IAiToolCallingManagerResult {
  toolResults: IAiToolResult[];
  returnDirectResult?: unknown;
}

export class AiToolCallingManager {
  constructor(
    private readonly executor = new AiToolExecutor(),
  ) {}

  async run(
    input: IAiToolCallingManagerInput,
  ): Promise<IAiToolCallingManagerResult> {
    const toolResults: IAiToolResult[] = [];

    for (const toolCall of input.toolCalls) {
      const result = await this.executor.execute(toolCall, input.tools, {
        provider: input.provider,
        model: input.model,
        userId: input.userId,
        metadata: input.metadata,
        signal: input.signal,
      });

      toolResults.push(result);

      const tool = input.tools.find(
        (candidate) => candidate.name === toolCall.name,
      );

      if (tool?.returnDirect) {
        return {
          toolResults,
          returnDirectResult: result.result ?? result.error,
        };
      }
    }

    return { toolResults };
  }
}
