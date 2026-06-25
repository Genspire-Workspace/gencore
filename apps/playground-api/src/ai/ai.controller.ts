import {
  AllowAnonymous,
  Controller,
  Get,
  HttpError,
  Post,
  RequestContext,
} from "@genspire/server";
import { AiContext } from "../../../../packages/ai/src/context/index.js";
import type { AiMessageContent } from "../../../../packages/ai/src/common/ai-content-part.js";
import type { IChatGenerationRequest } from "../../../../packages/ai/src/chat/chat-generation-request.js";
import type { IChatGenerationSettings } from "../../../../packages/ai/src/chat/chat-generation-settings.js";
import type { IChatMessage } from "../../../../packages/ai/src/chat/chat-message.js";
import type { IAiToolCall } from "../../../../packages/ai/src/tools/ai-tool-call.js";
import type { IAiToolResult } from "../../../../packages/ai/src/tools/ai-tool-result.js";
import type { IAiTool } from "../../../../packages/ai/src/tools/ai-tool.js";
import {
  AiChatRequestDto,
  AiChatResponseDto,
  AiChatStreamChunkDto,
  AiChatToolDto,
  type AiToolExecutionModeDto,
  AiEmbeddingRequestDto,
  AiEmbeddingResponseDto,
  AiProvidersResponseDto,
} from "./ai.dto.js";
import { aiPlaygroundRuntime } from "./ai-service-factory.js";

@Controller("/ai", {
  tag: "AI",
  description: "AI playground endpoints",
})
export class AiController {
  @AllowAnonymous()
  @Get("/providers", {
    summary: "List configured AI providers",
    response: AiProvidersResponseDto,
  })
  getProviders() {
    return {
      providers: aiPlaygroundRuntime.providers,
      defaults: aiPlaygroundRuntime.resolver.getDefaults(),
    };
  }

  @AllowAnonymous()
  @Post("/chat", {
    summary: "Generate a chat completion",
    request: AiChatRequestDto,
    response: AiChatResponseDto,
  })
  async generateChat(ctx: RequestContext) {
    const body = await ctx.json<AiChatRequestDto>();
    const toolExecutionModes = this.createToolExecutionModeMap(body.tools);
    const response = await aiPlaygroundRuntime.service.generateChatCompletion(
      this.createChatRequest(body),
    );

    this.assertNoClientToolResults(
      response.toolResults,
      toolExecutionModes,
    );

    return {
      id: response.id,
      provider: response.provider,
      model: response.model,
      message: this.toChatMessageDto(response.message),
      finishReason: response.finishReason,
      usage: response.usage as Record<string, unknown> | undefined,
      toolCalls: response.toolCalls?.map((toolCall) =>
        this.annotateToolCall(toolCall, toolExecutionModes)
      ) as unknown[] | undefined,
      toolResults: response.toolResults?.map((toolResult) =>
        this.annotateToolResult(toolResult, toolExecutionModes)
      ) as unknown[] | undefined,
      metadata: response.metadata,
    };
  }

  @AllowAnonymous()
  @Post("/chat/stream", {
    summary: "Stream a chat completion",
    request: AiChatRequestDto,
    response: AiChatStreamChunkDto,
  })
  async streamChat(ctx: RequestContext) {
    const body = await ctx.json<AiChatRequestDto>();
    const request = this.createChatRequest(body);
    const toolExecutionModes = this.createToolExecutionModeMap(body.tools);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          for await (const chunk of aiPlaygroundRuntime.service.streamChatCompletion(
            request,
          )) {
            if (chunk.toolResult) {
              this.assertToolResultOwnership(chunk.toolResult, toolExecutionModes);
            }

            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  id: chunk.id,
                  type: chunk.type,
                  provider: chunk.provider,
                  model: chunk.model,
                  delta: chunk.delta,
                  reasoningDelta: chunk.reasoningDelta,
                  message: chunk.message
                    ? this.toChatMessageDto(chunk.message)
                    : undefined,
                  toolCall: chunk.toolCall
                    ? this.annotateToolCall(chunk.toolCall, toolExecutionModes)
                    : undefined,
                  toolResult: chunk.toolResult
                    ? this.annotateToolResult(chunk.toolResult, toolExecutionModes)
                    : undefined,
                  finishReason: chunk.finishReason,
                  usage: chunk.usage,
                  metadata: chunk.metadata,
                })}\n`,
              ),
            );
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  @AllowAnonymous()
  @Post("/embeddings", {
    summary: "Generate embeddings",
    request: AiEmbeddingRequestDto,
    response: AiEmbeddingResponseDto,
  })
  async generateEmbedding(ctx: RequestContext) {
    const body = await ctx.json<AiEmbeddingRequestDto>();
    const resolved = this.resolveEmbedding(body);
    const response = await aiPlaygroundRuntime.service.generateEmbedding({
      provider: resolved.provider,
      model: resolved.model,
      apiKey: body.apiKey,
      apiKeyId: body.apiKeyId,
      userId: body.userId,
      input: body.input,
      dimensions: body.dimensions,
      metadata: body.metadata,
    });

    return {
      provider: response.provider,
      model: response.model,
      embeddings: response.embeddings,
      usage: response.usage as Record<string, unknown> | undefined,
      metadata: response.metadata,
    };
  }

  private createChatRequest(body: AiChatRequestDto): IChatGenerationRequest {
    const context = new AiContext();

    if (body.systemPrompt) {
      context.setSystemPrompt(body.systemPrompt);
    }

    context.addMessages((body.messages ?? []).map((message) =>
      this.toChatMessage(message)
    ));

    if (body.tools?.length) {
      context.addTools(body.tools.map((tool) => this.toDeclarativeTool(tool)));
    }

    context.mergeMetadata(body.metadata);
    context.mergeMetadata(body.settings?.metadata);

    const resolved = this.resolveChat(body);

    return context.toChatGenerationRequest({
      provider: resolved.provider,
      model: resolved.model,
      apiKey: body.apiKey,
      apiKeyId: body.apiKeyId,
      userId: body.userId,
      settings: this.toChatSettings(body.settings),
    });
  }

  private resolveChat(body: AiChatRequestDto): { provider?: string; model?: string } {
    return aiPlaygroundRuntime.resolver.resolve({
      provider: body.provider,
      model: body.model,
      kind: "chat",
    });
  }

  private resolveEmbedding(
    body: AiEmbeddingRequestDto,
  ): { provider?: string; model?: string } {
    return aiPlaygroundRuntime.resolver.resolve({
      provider: body.provider,
      model: body.model,
      kind: "embedding",
    });
  }

  private toDeclarativeTool(tool: AiChatToolDto): IAiTool {
    if (tool.executionMode === "server") {
      const resolvedTool = aiPlaygroundRuntime.serverToolRegistry.tryGet(tool.name);

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
        executionMode: this.resolveExecutionMode(tool.executionMode),
      },
    };
  }

  private createToolExecutionModeMap(
    tools: readonly AiChatToolDto[] | undefined,
  ): Map<string, AiToolExecutionModeDto> {
    const map = new Map<string, AiToolExecutionModeDto>();

    for (const tool of tools ?? []) {
      map.set(tool.name, this.resolveExecutionMode(tool.executionMode));
    }

    return map;
  }

  private resolveExecutionMode(
    executionMode: AiToolExecutionModeDto | undefined,
  ): AiToolExecutionModeDto {
    return executionMode ?? "client";
  }

  private annotateToolCall(
    toolCall: IAiToolCall,
    toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
  ): Record<string, unknown> {
    return {
      ...toolCall,
      executionMode: this.resolveToolExecutionModeByName(
        toolCall.name,
        toolExecutionModes,
      ),
    };
  }

  private annotateToolResult(
    toolResult: IAiToolResult,
    toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
  ): Record<string, unknown> {
    return {
      ...toolResult,
      executionMode: this.resolveToolExecutionModeByName(
        toolResult.name,
        toolExecutionModes,
      ),
    };
  }

  private resolveToolExecutionModeByName(
    name: string | undefined,
    toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
  ): AiToolExecutionModeDto {
    if (!name) {
      return "client";
    }

    return toolExecutionModes.get(name) ?? "client";
  }

  private assertNoClientToolResults(
    toolResults: readonly IAiToolResult[] | undefined,
    toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
  ): void {
    for (const toolResult of toolResults ?? []) {
      this.assertToolResultOwnership(toolResult, toolExecutionModes);
    }
  }

  private assertToolResultOwnership(
    toolResult: IAiToolResult,
    toolExecutionModes: ReadonlyMap<string, AiToolExecutionModeDto>,
  ): void {
    const executionMode = this.resolveToolExecutionModeByName(
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

  private toChatSettings(
    settings: AiChatRequestDto["settings"],
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

  private toChatMessage(message: AiChatRequestDto["messages"][number]): IChatMessage {
    return {
      role: message.role,
      content: message.content as AiMessageContent,
      ...(message.name ? { name: message.name } : {}),
      ...(message.metadata ? { metadata: message.metadata } : {}),
    };
  }

  private toChatMessageDto(message: IChatMessage) {
    return {
      role: message.role,
      content: message.content,
      ...(message.name ? { name: message.name } : {}),
      ...(message.metadata ? { metadata: message.metadata } : {}),
    };
  }
}
