import type { IAiTool, IAiToolExecutionContext } from "./ai-tool.js";
import type { IAiToolCall } from "./ai-tool-call.js";
import type { IAiToolResult } from "./ai-tool-result.js";

export type AiToolExecutorContext = Omit<
  IAiToolExecutionContext,
  "toolCallId" | "toolName"
>;

export class AiToolExecutor {
  async execute(
    toolCall: IAiToolCall,
    tools: readonly IAiTool[],
    context: AiToolExecutorContext = {},
  ): Promise<IAiToolResult> {
    const tool = tools.find((candidate) => candidate.name === toolCall.name);

    if (!tool) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' was not found.`,
        raw: toolCall.raw,
      };
    }

    if (!tool.execute) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' is not executable.`,
        raw: toolCall.raw,
      };
    }

    try {
      const result = await tool.execute(toolCall.arguments, {
        ...context,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      });

      const convertedResult = tool.resultConverter
        ? tool.resultConverter(result)
        : result;

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: convertedResult,
        raw: toolCall.raw,
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: error instanceof Error ? error.message : String(error),
        raw: toolCall.raw,
      };
    }
  }
}
