// file: apps\playground-api\src\ai\generation\ai-chat.controller.ts

import {
  AllowAnonymous,
  Controller,
  Post,
  RequestContext,
} from "@genspire/server";
import { getCurrentUser } from "@genspire/auth";
import type { IChatGenerationChunk } from "../../../../../packages/ai/src/chat/chat-generation-chunk.js";
import {
  AiChatRequestDto,
  AiChatResponseDto,
  AiChatStreamChunkDto,
} from "./ai.dto.js";
import { aiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import { AiRequestComposerService } from "./ai-request-composer.service.js";
import {
  annotateToolCall,
  annotateToolResult,
  assertNoClientToolResults,
  assertToolResultOwnership,
  toChatMessageDto,
} from "../shared/ai-chat-helpers.js";

@Controller("/ai", {
  tag: "AI",
  description: "AI chat generation endpoints",
})
export class AiChatController {
  static inject = [AiRequestComposerService];

  private static readonly heartbeatIntervalMs = Number(
    process.env.AI_STREAM_HEARTBEAT_INTERVAL_MS ?? "1000",
  );

  constructor(private readonly composer: AiRequestComposerService) {}

  @AllowAnonymous()
  @Post("/chat", {
    summary: "Generate a chat completion",
    request: AiChatRequestDto,
    response: AiChatResponseDto,
  })
  async generateChat(ctx: RequestContext) {
    const body = await ctx.json<AiChatRequestDto>();
    const { request, toolExecutionModes } = await this.composer.composeChatRequest(
      body,
      getCurrentUser(ctx),
      aiPlaygroundRuntime,
    );
    const response = await aiPlaygroundRuntime.service.generateChatCompletion(
      request,
    );

    assertNoClientToolResults(
      response.toolResults,
      toolExecutionModes,
    );

    return {
      id: response.id,
      provider: response.provider,
      model: response.model,
      message: toChatMessageDto(response.message),
      finishReason: response.finishReason,
      usage: response.usage as Record<string, unknown> | undefined,
      toolCalls: response.toolCalls?.map((toolCall) =>
        annotateToolCall(toolCall, toolExecutionModes)
      ) as unknown[] | undefined,
      toolResults: response.toolResults?.map((toolResult) =>
        annotateToolResult(toolResult, toolExecutionModes)
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
    const { request, toolExecutionModes } = await this.composer.composeChatRequest(
      body,
      getCurrentUser(ctx),
      aiPlaygroundRuntime,
    );
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
              const annotatedToolCall = annotateToolCall(
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
              assertToolResultOwnership(chunk.toolResult, toolExecutionModes);

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
                ? toChatMessageDto(chunk.message)
                : undefined,
              toolCall: chunk.toolCall
                ? annotateToolCall(chunk.toolCall, toolExecutionModes)
                : undefined,
              toolResult: chunk.toolResult
                ? annotateToolResult(chunk.toolResult, toolExecutionModes)
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
    const heartbeatIntervalMs = AiChatController.heartbeatIntervalMs;

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
        nextPromise.then((nextResult) => ({
          kind: "chunk" as const,
          result: nextResult,
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

    console.info("[AiChatController]", message, details);
  }
}
