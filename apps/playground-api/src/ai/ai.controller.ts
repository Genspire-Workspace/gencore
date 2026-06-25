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
import type { IChatGenerationChunk } from "../../../../packages/ai/src/chat/chat-generation-chunk.js";
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
  private static readonly heartbeatIntervalMs = Number(
    process.env.AI_STREAM_HEARTBEAT_INTERVAL_MS ?? "1000",
  );

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
        let streamClosed = false;
        let streamErrored = false;

        const safeEnqueue = (payload: unknown): boolean => {
          if (streamClosed || streamErrored) {
            return false;
          }

          controller.enqueue(
            encoder.encode(`${JSON.stringify(payload)}\n`),
          );
          return true;
        };

        const safeClose = (): void => {
          if (streamClosed || streamErrored) {
            return;
          }

          streamClosed = true;
          this.debugLog("Closing AI stream.", {
            provider: request.provider,
            model: request.model,
          });
          controller.close();
        };

        const safeError = (error: unknown): void => {
          if (streamClosed || streamErrored) {
            return;
          }

          this.debugLog("Streaming AI error.", {
            provider: request.provider,
            model: request.model,
            error:
              error instanceof Error ? error.message : String(error),
          });

          safeEnqueue({
            type: "error",
            provider: request.provider ?? "unknown",
            model: request.model ?? "unknown",
            error: error instanceof Error ? error.message : String(error),
          });
          streamErrored = true;
          streamClosed = true;
          controller.close();
        };

        try {
          const iterator = aiPlaygroundRuntime.service.streamChatCompletion(
            request,
          )[Symbol.asyncIterator]();
          const pendingServerTools = new Map<
            string,
            {
              toolCallId: string;
              toolName?: string;
              startedAt: number;
            }
          >();

          while (true) {
            const nextChunk = await this.readNextChunkWithHeartbeats(
              iterator,
              safeEnqueue,
              pendingServerTools,
              request.provider,
              request.model,
            );

            if (nextChunk.done) {
              break;
            }

            const chunk = nextChunk.value;

            if (chunk.toolCall) {
              const annotatedToolCall = this.annotateToolCall(
                chunk.toolCall,
                toolExecutionModes,
              );
              const executionMode = annotatedToolCall.executionMode;

              if (
                executionMode === "server" &&
                chunk.toolCall.id
              ) {
                pendingServerTools.set(chunk.toolCall.id, {
                  toolCallId: chunk.toolCall.id,
                  toolName: chunk.toolCall.name,
                  startedAt: Date.now(),
                });
                this.debugLog("Heartbeat tracking started for server tool.", {
                  provider: request.provider,
                  model: request.model,
                  toolCallId: chunk.toolCall.id,
                  toolName: chunk.toolCall.name,
                });
              }
            }

            if (chunk.toolResult) {
              this.assertToolResultOwnership(chunk.toolResult, toolExecutionModes);

              if (chunk.toolResult.toolCallId) {
                pendingServerTools.delete(chunk.toolResult.toolCallId);
                this.debugLog("Heartbeat tracking stopped for server tool.", {
                  provider: request.provider,
                  model: request.model,
                  toolCallId: chunk.toolResult.toolCallId,
                  toolName: chunk.toolResult.name,
                });
              }
            }

            safeEnqueue({
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
            });
          }
          safeClose();
        } catch (error) {
          safeError(error);
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

  private async readNextChunkWithHeartbeats(
    iterator: AsyncIterator<IChatGenerationChunk>,
    enqueue: (payload: unknown) => boolean,
    pendingServerTools: ReadonlyMap<
      string,
      {
        toolCallId: string;
        toolName?: string;
        startedAt: number;
      }
    >,
    provider?: string,
    model?: string,
  ): Promise<IteratorResult<IChatGenerationChunk>> {
    const heartbeatIntervalMs = AiController.heartbeatIntervalMs;

    if (heartbeatIntervalMs <= 0 || pendingServerTools.size === 0) {
      return iterator.next();
    }

    const nextPromise = iterator.next();

    while (true) {
      const result = await Promise.race<
        | {
          kind: "chunk";
          result: IteratorResult<IChatGenerationChunk>;
        }
        | { kind: "heartbeat" }
      >([
        nextPromise.then((result) => ({
          kind: "chunk" as const,
          result,
        })),
        Bun.sleep(heartbeatIntervalMs).then(() => ({
          kind: "heartbeat" as const,
        })),
      ]);

      if (result.kind === "chunk") {
        return result.result;
      }

      this.debugLog("Emitting tool_execution heartbeat.", {
        provider,
        model,
        heartbeatIntervalMs,
        pendingServerToolCount: pendingServerTools.size,
      });

      for (const pendingTool of pendingServerTools.values()) {
        enqueue({
          type: "heartbeat",
          phase: "tool_execution",
          elapsedMs: Date.now() - pendingTool.startedAt,
          toolCallId: pendingTool.toolCallId,
          toolName: pendingTool.toolName,
        });
      }
    }
  }

  private debugLog(message: string, details: Record<string, unknown>): void {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.AI_DEBUG_STREAM !== "true"
    ) {
      return;
    }

    console.info("[AiController]", message, details);
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
