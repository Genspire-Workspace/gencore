// file: apps\playground-ai\shared\verify-api-tools.ts

import type { IAiTool } from "../../../packages/ai/src/tools/ai-tool.js";
import type { IAiToolCall } from "../../../packages/ai/src/tools/ai-tool-call.js";
import type { IAiToolResult } from "../../../packages/ai/src/tools/ai-tool-result.js";
import { AiToolExecutor } from "../../../packages/ai/src/tools/ai-tool-executor.js";
import {
  createToolCallFromUnknown,
  createToolResultFromUnknown,
  isRecord,
} from "../../../packages/ai/src/tools/ai-tool-utils.js";

export type AiApiToolExecutionMode = "client" | "server";

export interface IAiOwnedToolCall extends IAiToolCall {
  executionMode?: AiApiToolExecutionMode;
}

export interface IAiOwnedToolResult extends IAiToolResult {
  executionMode?: AiApiToolExecutionMode;
}

export interface IAiApiChatMessageDto {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiApiChatToolDto {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  executionMode?: AiApiToolExecutionMode;
}

export interface IAiCollectedApiStream {
  chunks: unknown[];
  text: string;
  toolCalls: IAiOwnedToolCall[];
  toolResults: IAiOwnedToolResult[];
  heartbeats: IAiApiHeartbeatChunk[];
}

export interface IAiApiHeartbeatChunk {
  type: "heartbeat";
  phase?: string;
  elapsedMs?: number;
  toolCallId?: string;
  toolName?: string;
}

function stringifyToolResultContent(result: IAiToolResult): string {
  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  return typeof result.result === "string"
    ? result.result
    : JSON.stringify(result.result ?? null);
}

export function createDeclarativeToolDto(
  tool: IAiTool,
  executionMode: AiApiToolExecutionMode,
): IAiApiChatToolDto {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    executionMode,
  };
}

export function readToolExecutionMode(
  value: unknown,
): AiApiToolExecutionMode | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return value.executionMode === "client" || value.executionMode === "server"
    ? value.executionMode
    : undefined;
}

export function collectTextFromApiChunks(chunks: readonly unknown[]): string {
  let text = "";

  for (const chunk of chunks) {
    if (!isRecord(chunk)) {
      continue;
    }

    if (typeof chunk.delta === "string") {
      text += chunk.delta;
    }

    if (
      isRecord(chunk.message) &&
      typeof chunk.message.content === "string" &&
      !chunk.delta
    ) {
      text += chunk.message.content;
    }
  }

  return text;
}

export function collectToolCallsFromApiChunks(
  chunks: readonly unknown[],
): IAiOwnedToolCall[] {
  const toolCalls: IAiOwnedToolCall[] = [];

  for (const chunk of chunks) {
    if (!isRecord(chunk)) {
      continue;
    }

    const toolCallValue = chunk.toolCall;
    const toolCall = createToolCallFromUnknown(toolCallValue);

    if (!toolCall) {
      continue;
    }

    toolCalls.push({
      ...toolCall,
      executionMode: readToolExecutionMode(toolCallValue),
    });
  }

  return toolCalls;
}

export function collectToolResultsFromApiChunks(
  chunks: readonly unknown[],
): IAiOwnedToolResult[] {
  const toolResults: IAiOwnedToolResult[] = [];

  for (const chunk of chunks) {
    if (!isRecord(chunk)) {
      continue;
    }

    const toolResultValue = chunk.toolResult;
    const toolResult = createToolResultFromUnknown(toolResultValue);

    if (!toolResult) {
      continue;
    }

    toolResults.push({
      ...toolResult,
      executionMode: readToolExecutionMode(toolResultValue),
    });
  }

  return toolResults;
}

export function collectHeartbeatsFromApiChunks(
  chunks: readonly unknown[],
): IAiApiHeartbeatChunk[] {
  const heartbeats: IAiApiHeartbeatChunk[] = [];

  for (const chunk of chunks) {
    if (!isRecord(chunk) || chunk.type !== "heartbeat") {
      continue;
    }

    heartbeats.push({
      type: "heartbeat",
      phase: typeof chunk.phase === "string" ? chunk.phase : undefined,
      elapsedMs: typeof chunk.elapsedMs === "number" ? chunk.elapsedMs : undefined,
      toolCallId:
        typeof chunk.toolCallId === "string" ? chunk.toolCallId : undefined,
      toolName: typeof chunk.toolName === "string" ? chunk.toolName : undefined,
    });
  }

  return heartbeats;
}

export function collectApiStream(chunks: readonly unknown[]): IAiCollectedApiStream {
  return {
    chunks: [...chunks],
    text: collectTextFromApiChunks(chunks),
    toolCalls: collectToolCallsFromApiChunks(chunks),
    toolResults: collectToolResultsFromApiChunks(chunks),
    heartbeats: collectHeartbeatsFromApiChunks(chunks),
  };
}

export async function executeSmokeClientToolCall(
  toolCall: IAiToolCall,
  tools: readonly IAiTool[],
): Promise<IAiToolResult> {
  const executor = new AiToolExecutor();

  return executor.execute(toolCall, tools, {
    provider: "verify-api",
    model: "verify-api-client-tools",
    metadata: {
      executionMode: "client",
    },
  });
}

export async function executeSmokeClientToolCalls(
  toolCalls: readonly IAiToolCall[],
  tools: readonly IAiTool[],
): Promise<IAiToolResult[]> {
  for (const toolCall of toolCalls) {
    const tool = tools.find((candidate) => candidate.name === toolCall.name);

    if (!tool) {
      throw new Error(
        `No local client tool implementation is registered for '${toolCall.name}'.`,
      );
    }
  }

  const results: IAiToolResult[] = [];

  for (const toolCall of toolCalls) {
    results.push(await executeSmokeClientToolCall(toolCall, tools));
  }

  return results;
}

export function createAssistantToolCallMessage(
  toolCalls: readonly IAiToolCall[],
): IAiApiChatMessageDto | undefined {
  if (toolCalls.length === 0) {
    return undefined;
  }

  return {
    role: "assistant",
    content: toolCalls.map((toolCall) => ({
      type: "tool_call" as const,
      id: toolCall.id,
      name: toolCall.name,
      arguments: toolCall.arguments,
    })),
  };
}

export function createToolResultMessages(
  toolResults: readonly IAiToolResult[],
): IAiApiChatMessageDto[] {
  return toolResults.map((toolResult) => ({
    role: "tool",
    content: [
      {
        type: "tool_result" as const,
        toolCallId: toolResult.toolCallId,
        content: stringifyToolResultContent(toolResult),
      },
    ],
  }));
}

export function appendToolInteractionMessages(
  messages: readonly IAiApiChatMessageDto[],
  toolCalls: readonly IAiToolCall[],
  toolResults: readonly IAiToolResult[],
): IAiApiChatMessageDto[] {
  const nextMessages = [...messages];
  const assistantMessage = createAssistantToolCallMessage(toolCalls);

  if (assistantMessage) {
    nextMessages.push(assistantMessage);
  }

  nextMessages.push(...createToolResultMessages(toolResults));
  return nextMessages;
}

export function extractTextFromApiChatResponseBody(body: unknown): string {
  if (!isRecord(body) || !isRecord(body.message)) {
    return "";
  }

  const content = body.message.content;

  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(isRecord)
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");
}
