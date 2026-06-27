// file: apps\playground-api\src\ai\shared\ai-chat-helpers.ts

import type { AiMessageContent } from "../../../../../packages/ai/src/domain/messages/ai-content-part.js";
import { AiContext } from "../../../../../packages/ai/src/domain/context/index.js";
import type { IChatGenerationRequest } from "../../../../../packages/ai/src/domain/chat/chat-generation-request.js";
import type { IChatGenerationSettings } from "../../../../../packages/ai/src/domain/chat/chat-generation-settings.js";
import type { IChatMessage } from "../../../../../packages/ai/src/domain/chat/chat-message.js";
import type { IAiToolCall } from "../../../../../packages/ai/src/domain/tools/ai-tool-call.js";
import type { IAiToolResult } from "../../../../../packages/ai/src/domain/tools/ai-tool-result.js";
import type { IAiTool } from "../../../../../packages/ai/src/domain/tools/ai-tool.js";
import { HttpError } from "@genspire/server";
import type { AiChatRequestDto, AiChatSettingsDto, AiChatToolDto, AiToolExecutionModeDto } from "../generation/ai.dto.js";
import type { IAiPlaygroundRuntime } from "../runtime/ai-service-factory.js";

export function resolveExecutionMode(
  executionMode: AiToolExecutionModeDto | undefined,
): AiToolExecutionModeDto {
  return executionMode ?? "client";
}

export function createToolExecutionModeMap(
  tools: readonly AiChatToolDto[] | undefined,
): Map<string, AiToolExecutionModeDto> {
  const map = new Map<string, AiToolExecutionModeDto>();

  for (const tool of tools ?? []) {
    map.set(tool.name, resolveExecutionMode(tool.executionMode));
  }

  return map;
}

export function toDeclarativeTool(
  tool: AiChatToolDto,
  runtime: IAiPlaygroundRuntime,
): IAiTool {
  if (tool.executionMode === "server") {
    const resolvedTool = runtime.serverToolRegistry.tryGet(tool.name);

    if (!resolvedTool) {
      throw new HttpError(400, `Unknown server AI tool '${tool.name}'.`, {
        code: "AI_SERVER_TOOL_NOT_FOUND",
      });
    }

    return resolvedTool;
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    metadata: {
      executionMode: resolveExecutionMode(tool.executionMode),
    },
  };
}

export function annotateToolCall(
  toolCall: IAiToolCall,
  toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
): Record<string, unknown> {
  return {
    ...toolCall,
    executionMode: resolveToolExecutionModeByName(
      toolCall.name,
      toolExecutionModes,
    ),
  };
}

export function annotateToolResult(
  toolResult: IAiToolResult,
  toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
): Record<string, unknown> {
  return {
    ...toolResult,
    executionMode: resolveToolExecutionModeByName(
      toolResult.name,
      toolExecutionModes,
    ),
  };
}

export function resolveToolExecutionModeByName(
  name: string | undefined,
  toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
): AiToolExecutionModeDto {
  if (!name) {
    return "client";
  }

  return toolExecutionModes.get(name) ?? "client";
}

export function assertNoClientToolResults(
  toolResults: readonly IAiToolResult[] | undefined,
  toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
): void {
  for (const toolResult of toolResults ?? []) {
    assertToolResultOwnership(toolResult, toolExecutionModes);
  }
}

export function assertToolResultOwnership(
  toolResult: IAiToolResult,
  toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
): void {
  const executionMode = resolveToolExecutionModeByName(
    toolResult.name,
    toolExecutionModes,
  );

  if (executionMode === "client" && toolResult.name) {
    throw new HttpError(
      500,
      `Client-owned AI tool '${toolResult.name}' was unexpectedly executed on the server.`,
      {
        code: "AI_CLIENT_TOOL_EXECUTED_ON_SERVER",
      },
    );
  }
}

export function toChatSettings(
  settings: AiChatSettingsDto | undefined,
): IChatGenerationSettings | undefined {
  if (!settings) {
    return undefined;
  }

  return {
    reasoningEffort: settings.reasoningEffort,
    temperature: settings.temperature,
    topP: settings.topP,
    maxTokens: settings.maxTokens,
    stop: settings.stop,
    toolChoice: settings.toolChoice as IChatGenerationSettings["toolChoice"],
    maxToolSteps: settings.maxToolSteps,
  };
}

export function toChatMessage(
  message: { role: string; content: unknown; name?: string; metadata?: Record<string, unknown> },
): IChatMessage {
  return {
    role: message.role as IChatMessage["role"],
    content: message.content as AiMessageContent,
    ...(message.name ? { name: message.name } : {}),
    ...(message.metadata ? { metadata: message.metadata } : {}),
  };
}

export function toChatMessageDto(message: IChatMessage) {
  return {
    role: message.role,
    content: message.content,
    ...(message.name ? { name: message.name } : {}),
    ...(message.metadata ? { metadata: message.metadata } : {}),
  };
}

export interface BuildChatRequestInput {
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyId?: string;
  userId?: string;
  systemPrompt?: string;
  messages: AiChatRequestDto["messages"];
  tools?: AiChatToolDto[];
  settings?: AiChatSettingsDto;
  metadata?: Record<string, unknown>;
}

export function buildChatRequest(
  input: BuildChatRequestInput,
  runtime: IAiPlaygroundRuntime,
): IChatGenerationRequest {
  const context = new AiContext();

  if (input.systemPrompt) {
    context.setSystemPrompt(input.systemPrompt);
  }

  context.addMessages((input.messages ?? []).map((message) => toChatMessage(message)));

  if (input.tools?.length) {
    context.addTools(input.tools.map((tool) => toDeclarativeTool(tool, runtime)));
  }

  context.mergeMetadata(input.metadata);
  context.mergeMetadata(input.settings?.metadata);

  const resolved = runtime.resolver.resolve({
    provider: input.provider,
    model: input.model,
    kind: "chat",
  });

  return context.toChatGenerationRequest({
    provider: resolved.provider,
    model: resolved.model,
    apiKey: input.apiKey,
    apiKeyId: input.apiKeyId,
    userId: input.userId,
    settings: toChatSettings(input.settings),
  });
}
