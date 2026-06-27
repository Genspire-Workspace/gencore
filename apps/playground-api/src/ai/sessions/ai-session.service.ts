// file: apps\playground-api\src\ai\sessions\ai-session.service.ts

import { GenError, Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import { PlaygroundDbContext } from "../../database/playground-db-context.js";
import { AiSessionEntity } from "./ai-session.entity.js";
import { AiSessionMessageEntity, type AiSessionMessageRole } from "./ai-session-message.entity.js";
import { aiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import { AiRequestComposerService } from "../generation/ai-request-composer.service.js";
import {
  annotateToolCall,
  annotateToolResult,
  assertNoClientToolResults,
  assertToolResultOwnership,
  toChatMessageDto,
} from "../shared/ai-chat-helpers.js";
import type {
  AiSessionListResponseDto,
  AiSessionMessageDto,
  AiSessionMessageListResponseDto,
  AiSessionResponseDto,
  CreateAiSessionRequestDto,
  DeleteAiSessionResponseDto,
  GenerateAiSessionMessageRequestDto,
  GenerateAiSessionMessageResponseDto,
  UpdateAiSessionRequestDto,
} from "./ai-session.dto.js";
import type { AiChatRequestDto } from "../generation/ai.dto.js";
import type { IChatGenerationChunk } from "../../../../../packages/ai/src/domain/chat/chat-generation-chunk.js";
import type { IChatGenerationResponse } from "../../../../../packages/ai/src/domain/chat/chat-generation-response.js";
import type { IChatMessage } from "../../../../../packages/ai/src/domain/chat/chat-message.js";

const TITLE_MAX_LENGTH = 80;
const STREAM_HEARTBEAT_INTERVAL_MS = Number(
  process.env.AI_STREAM_HEARTBEAT_INTERVAL_MS ?? "1000",
);

function toSessionResponse(session: AiSessionEntity): AiSessionResponseDto {
  return {
    id: session.id,
    userId: session.userId,
    title: session.title,
    provider: session.provider,
    model: session.model,
    systemPrompt: session.systemPrompt,
    metadata: session.metadata,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toSessionMessageResponse(
  message: AiSessionMessageEntity,
): AiSessionMessageDto {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    name: message.name,
    provider: message.provider,
    model: message.model,
    finishReason: message.finishReason,
    usage: message.usage,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
    metadata: message.metadata,
    createdAt: message.createdAt.toISOString(),
  };
}

function deriveTitle(content: unknown): string {
  if (typeof content === "string") {
    return content.length > TITLE_MAX_LENGTH
      ? `${content.slice(0, TITLE_MAX_LENGTH)}...`
      : content;
  }

  if (Array.isArray(content)) {
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        (part as { type: string }).type === "text" &&
        "text" in part &&
        typeof (part as { text: string }).text === "string"
      ) {
        const text = (part as { text: string }).text;
        return text.length > TITLE_MAX_LENGTH
          ? `${text.slice(0, TITLE_MAX_LENGTH)}...`
          : text;
      }
    }

    const firstString = content.find((part) => typeof part === "string");
    if (typeof firstString === "string") {
      return firstString.length > TITLE_MAX_LENGTH
        ? `${firstString.slice(0, TITLE_MAX_LENGTH)}...`
        : firstString;
    }
  }

  return "Untitled session";
}

function hasMeaningfulContent(content: unknown): boolean {
  if (typeof content === "string") {
    return content.trim().length > 0;
  }

  if (Array.isArray(content)) {
    return content.length > 0;
  }

  return content !== null && content !== undefined;
}

function toChatRequestInput(
  input: GenerateAiSessionMessageRequestDto,
): Pick<AiChatRequestDto, "provider" | "model" | "apiKey" | "apiKeyId" | "systemPrompt" | "tools" | "settings" | "metadata"> & {
  messages: AiChatRequestDto["messages"];
  promptIds?: string[];
  skillIds?: string[];
  promptVariables?: Record<string, unknown>;
} {
  return {
    provider: input.provider,
    model: input.model,
    apiKey: input.apiKey,
    apiKeyId: input.apiKeyId,
    systemPrompt: input.systemPrompt,
    messages: [],
    tools: input.tools,
    settings: input.settings,
    metadata: input.metadata,
    promptIds: input.promptIds,
    skillIds: input.skillIds,
    promptVariables: input.promptVariables,
  };
}

function asContentMessage(
  role: AiSessionMessageRole,
  entity: AiSessionMessageEntity,
): IChatMessage {
  return {
    role,
    content: entity.content as IChatMessage["content"],
    ...(entity.name ? { name: entity.name } : {}),
    ...(entity.metadata ? { metadata: entity.metadata } : {}),
  };
}

@Scoped()
export class AiSessionService {
  static inject = [PlaygroundDbContext, AiRequestComposerService];

  constructor(
    private readonly db: PlaygroundDbContext,
    private readonly composer: AiRequestComposerService,
  ) {}

  async listForUser(userId: string): Promise<AiSessionListResponseDto> {
    const sessions = await this.db.aiSessions.list({
      where: { userId } as Partial<AiSessionEntity>,
      orderBy: "updatedAt",
      direction: "desc",
    });

    return { items: sessions.map(toSessionResponse) };
  }

  async getById(
    userId: string,
    id: string,
  ): Promise<AiSessionResponseDto | null> {
    const session = await this.db.aiSessions.findById(id);
    if (!session || session.userId !== userId) {
      return null;
    }
    return toSessionResponse(session);
  }

  async create(
    userId: string,
    input: CreateAiSessionRequestDto,
  ): Promise<AiSessionResponseDto> {
    const now = new Date();
    const session = new AiSessionEntity();
    session.id = crypto.randomUUID();
    session.userId = userId;
    session.title = input.title?.trim() ? input.title!.trim() : null;
    session.provider = input.provider ?? null;
    session.model = input.model ?? null;
    session.systemPrompt = input.systemPrompt ?? null;
    session.metadata = input.metadata ?? null;
    session.createdAt = now;
    session.updatedAt = now;

    await this.db.aiSessions.add(session);
    await this.db.saveChanges();

    return toSessionResponse(session);
  }

  async updateById(
    userId: string,
    id: string,
    input: UpdateAiSessionRequestDto,
  ): Promise<AiSessionResponseDto | null> {
    const session = await this.db.aiSessions.findById(id);
    if (!session || session.userId !== userId) {
      return null;
    }

    if (input.title !== undefined) {
      session.title = input.title?.trim() ? input.title.trim() : null;
    }
    if (input.provider !== undefined) {
      session.provider = input.provider ?? null;
    }
    if (input.model !== undefined) {
      session.model = input.model ?? null;
    }
    if (input.systemPrompt !== undefined) {
      session.systemPrompt = input.systemPrompt ?? null;
    }
    if (input.metadata !== undefined) {
      session.metadata = input.metadata ?? null;
    }
    session.updatedAt = new Date();

    await this.db.aiSessions.update(session);
    await this.db.saveChanges();

    return toSessionResponse(session);
  }

  async deleteById(
    userId: string,
    id: string,
  ): Promise<DeleteAiSessionResponseDto> {
    const session = await this.db.aiSessions.findById(id);
    if (!session || session.userId !== userId) {
      return { deleted: false };
    }

    const messages = await this.db.aiSessionMessages.list({
      where: { sessionId: id } as Partial<AiSessionMessageEntity>,
    });

    for (const message of messages) {
      await this.db.aiSessionMessages.remove(message);
    }

    await this.db.aiSessions.remove(session);
    await this.db.saveChanges();

    return { deleted: true };
  }

  async listMessages(
    userId: string,
    sessionId: string,
  ): Promise<AiSessionMessageListResponseDto | null> {
    const session = await this.db.aiSessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }

    const messages = await this.db.aiSessionMessages.list({
      where: { sessionId } as Partial<AiSessionMessageEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });

    return { items: messages.map(toSessionMessageResponse) };
  }

  async generateMessage(
    userId: string,
    sessionId: string,
    input: GenerateAiSessionMessageRequestDto,
  ): Promise<GenerateAiSessionMessageResponseDto | null> {
    const session = await this.db.aiSessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }

    if (input.content === undefined || input.content === null) {
      throw new GenError("Message content is required.", "AI_SESSION_VALIDATION_ERROR");
    }

    const now = new Date();
    const userMessage = new AiSessionMessageEntity();
    userMessage.id = crypto.randomUUID();
    userMessage.sessionId = sessionId;
    userMessage.role = "user";
    userMessage.content = input.content;
    userMessage.createdAt = now;

    await this.db.aiSessionMessages.add(userMessage);

    const history = await this.db.aiSessionMessages.list({
      where: { sessionId } as Partial<AiSessionMessageEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });

    const resolvedSystemPrompt = input.systemPrompt ?? session.systemPrompt ?? undefined;
    const historyMessages = history
      .filter((message) => message.role !== "system")
      .map((message) => asContentMessage(message.role, message));

    const requestInput = toChatRequestInput(input);
    requestInput.systemPrompt = resolvedSystemPrompt;
    requestInput.messages = historyMessages as AiChatRequestDto["messages"];

    const { request, toolExecutionModes } = await this.composer.composeChatRequest(
      requestInput,
      { id: userId, email: "", roles: [] } satisfies ICurrentUser,
      aiPlaygroundRuntime,
    );
    const response: IChatGenerationResponse =
      await aiPlaygroundRuntime.service.generateChatCompletion(request);

    assertNoClientToolResults(response.toolResults, toolExecutionModes);

    const assistantMessage = new AiSessionMessageEntity();
    assistantMessage.id = crypto.randomUUID();
    assistantMessage.sessionId = sessionId;
    assistantMessage.role = "assistant";
    assistantMessage.content = response.message.content as unknown;
    assistantMessage.name = response.message.name ?? null;
    assistantMessage.provider = response.provider;
    assistantMessage.model = response.model;
    assistantMessage.finishReason = response.finishReason ?? null;
    assistantMessage.usage =
      (response.usage as Record<string, unknown> | undefined) ?? null;
    assistantMessage.toolCalls = response.toolCalls
      ? response.toolCalls.map((toolCall) =>
          annotateToolCall(toolCall, toolExecutionModes),
        )
      : null;
    assistantMessage.toolResults = response.toolResults
      ? response.toolResults.map((toolResult) =>
          annotateToolResult(toolResult, toolExecutionModes),
        )
      : null;
    assistantMessage.metadata = response.metadata ?? null;
    assistantMessage.createdAt = new Date();

    await this.db.aiSessionMessages.add(assistantMessage);

    const toolMessages = (response.toolResults ?? [])
      .map((toolResult) => {
        if (!toolResult.name) {
          return null;
        }
        const toolMessage = new AiSessionMessageEntity();
        toolMessage.id = crypto.randomUUID();
        toolMessage.sessionId = sessionId;
        toolMessage.role = "tool";
        toolMessage.content = toolResult.result ?? null;
        toolMessage.name = toolResult.name;
        toolMessage.provider = response.provider;
        toolMessage.model = response.model;
        toolMessage.metadata = null;
        toolMessage.createdAt = new Date();
        return toolMessage;
      })
      .filter((message): message is AiSessionMessageEntity => message !== null);

    for (const toolMessage of toolMessages) {
      await this.db.aiSessionMessages.add(toolMessage);
    }

    session.provider = response.provider;
    session.model = response.model;
    if (session.title === null) {
      session.title = deriveTitle(input.content);
    }
    session.updatedAt = new Date();

    await this.db.aiSessions.update(session);
    await this.db.saveChanges();

    return {
      sessionId,
      userMessage: toSessionMessageResponse(userMessage),
      assistantMessage: toSessionMessageResponse(assistantMessage),
      finishReason: response.finishReason,
      usage: response.usage as Record<string, unknown> | undefined,
      toolCalls: assistantMessage.toolCalls ?? undefined,
      toolResults: assistantMessage.toolResults ?? undefined,
      metadata: response.metadata,
    };
  }

  async streamMessage(
    userId: string,
    sessionId: string,
    input: GenerateAiSessionMessageRequestDto,
  ): Promise<Response | null> {
    const session = await this.db.aiSessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }

    if (input.content === undefined || input.content === null) {
      throw new GenError("Message content is required.", "AI_SESSION_VALIDATION_ERROR");
    }

    const now = new Date();
    const userMessage = new AiSessionMessageEntity();
    userMessage.id = crypto.randomUUID();
    userMessage.sessionId = sessionId;
    userMessage.role = "user";
    userMessage.content = input.content;
    userMessage.createdAt = now;

    await this.db.aiSessionMessages.add(userMessage);

    const history = await this.db.aiSessionMessages.list({
      where: { sessionId } as Partial<AiSessionMessageEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });

    const resolvedSystemPrompt = input.systemPrompt ?? session.systemPrompt ?? undefined;
    const historyMessages = history
      .filter((message) => message.role !== "system")
      .map((message) => asContentMessage(message.role, message));

    const requestInput = toChatRequestInput(input);
    requestInput.systemPrompt = resolvedSystemPrompt;
    requestInput.messages = historyMessages as AiChatRequestDto["messages"];

    const { request, toolExecutionModes } = await this.composer.composeChatRequest(
      requestInput,
      { id: userId, email: "", roles: [] } satisfies ICurrentUser,
      aiPlaygroundRuntime,
    );
    const encoder = new TextEncoder();

    const assistantMessageId = crypto.randomUUID();
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        let streamClosed = false;
        let streamErrored = false;
        let finalMessageChunk: IChatGenerationChunk | null = null;
        let terminalChunk: IChatGenerationChunk | null = null;
        let accumulatedAssistantText = "";
        let emittedChunkCount = 0;

        const safeEnqueue = (payload: unknown): boolean => {
          if (streamClosed || streamErrored) {
            return false;
          }
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          emittedChunkCount += 1;
          return true;
        };

        const safeClose = (): void => {
          if (streamClosed || streamErrored) {
            return;
          }
          streamClosed = true;
          controller.close();
        };

        const safeError = (error: unknown): void => {
          if (streamClosed || streamErrored) {
            return;
          }
          safeEnqueue({
            type: "error",
            sessionId,
            userMessageId: userMessage.id,
            assistantMessageId,
            provider: request.provider ?? "unknown",
            model: request.model ?? "unknown",
            error: error instanceof Error ? error.message : String(error),
          });
          streamErrored = true;
          streamClosed = true;
          controller.close();
        };

        try {
          const iterator = aiPlaygroundRuntime.service
            .streamChatCompletion(request)[Symbol.asyncIterator]();
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
              sessionId,
              userMessage.id,
              assistantMessageId,
            );

            if (nextChunk.done) {
              break;
            }
            const chunk = nextChunk.value;
            terminalChunk = chunk;

            if (chunk.message) {
              finalMessageChunk = chunk;
            }

            if (typeof chunk.delta === "string") {
              accumulatedAssistantText += chunk.delta;
            }

            if (chunk.toolCall) {
              const annotatedToolCall = annotateToolCall(
                chunk.toolCall,
                toolExecutionModes,
              );

              if (
                annotatedToolCall.executionMode === "server" &&
                chunk.toolCall.id
              ) {
                pendingServerTools.set(chunk.toolCall.id, {
                  toolCallId: chunk.toolCall.id,
                  toolName: chunk.toolCall.name,
                  startedAt: Date.now(),
                });
              }
            }

            if (chunk.toolResult) {
              assertToolResultOwnership(chunk.toolResult, toolExecutionModes);

              if (chunk.toolResult.toolCallId) {
                pendingServerTools.delete(chunk.toolResult.toolCallId);
              }
            }

            safeEnqueue({
              id: chunk.id,
              type: chunk.type,
              provider: chunk.provider,
              model: chunk.model,
              delta: chunk.delta,
              reasoningDelta: chunk.reasoningDelta,
              message: chunk.message ? toChatMessageDto(chunk.message) : undefined,
              toolCall: chunk.toolCall
                ? annotateToolCall(chunk.toolCall, toolExecutionModes)
                : undefined,
              toolResult: chunk.toolResult
                ? annotateToolResult(chunk.toolResult, toolExecutionModes)
                : undefined,
              finishReason: chunk.finishReason,
              usage: chunk.usage,
              metadata: chunk.metadata,
              sessionId,
              userMessageId: userMessage.id,
              assistantMessageId,
            });
          }

          const assistantMessage = await this.persistAssistantFromStream(
            session,
            sessionId,
            assistantMessageId,
            userMessage,
            input,
            finalMessageChunk,
            terminalChunk,
            accumulatedAssistantText,
            request.provider,
            request.model,
          );

          if (emittedChunkCount === 0) {
            safeEnqueue({
              type: "message",
              provider: assistantMessage.provider ?? request.provider,
              model: assistantMessage.model ?? request.model,
              message: toChatMessageDto({
                role: "assistant",
                content: assistantMessage.content as IChatMessage["content"],
                ...(assistantMessage.name ? { name: assistantMessage.name } : {}),
                ...(assistantMessage.metadata ? { metadata: assistantMessage.metadata } : {}),
              }),
              finishReason: assistantMessage.finishReason ?? undefined,
              usage: assistantMessage.usage ?? undefined,
              metadata: assistantMessage.metadata ?? undefined,
              sessionId,
              userMessageId: userMessage.id,
              assistantMessageId,
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
    provider: string | undefined,
    model: string | undefined,
    sessionId: string,
    userMessageId: string,
    assistantMessageId: string,
  ): Promise<IteratorResult<IChatGenerationChunk>> {
    if (STREAM_HEARTBEAT_INTERVAL_MS <= 0 || pendingServerTools.size === 0) {
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
        Bun.sleep(STREAM_HEARTBEAT_INTERVAL_MS).then(() => ({
          kind: "heartbeat" as const,
        })),
      ]);

      if (result.kind === "chunk") {
        return result.result;
      }

      for (const pendingTool of pendingServerTools.values()) {
        enqueue({
          type: "heartbeat",
          phase: "tool_execution",
          elapsedMs: Date.now() - pendingTool.startedAt,
          toolCallId: pendingTool.toolCallId,
          toolName: pendingTool.toolName,
          provider,
          model,
          sessionId,
          userMessageId,
          assistantMessageId,
        });
      }
    }
  }

  private async persistAssistantFromStream(
    session: AiSessionEntity,
    sessionId: string,
    assistantMessageId: string,
    _userMessage: AiSessionMessageEntity,
    input: GenerateAiSessionMessageRequestDto,
    finalMessageChunk: IChatGenerationChunk | null,
    terminalChunk: IChatGenerationChunk | null,
    accumulatedAssistantText: string,
    provider: string | undefined,
    model: string | undefined,
  ): Promise<AiSessionMessageEntity> {
    const resolvedContent = finalMessageChunk?.message?.content;

    const assistantMessage = new AiSessionMessageEntity();
    assistantMessage.id = assistantMessageId;
    assistantMessage.sessionId = sessionId;
    assistantMessage.role = "assistant";
    assistantMessage.content = (
      hasMeaningfulContent(resolvedContent)
        ? resolvedContent
        : accumulatedAssistantText
    ) as unknown;
    assistantMessage.name = finalMessageChunk?.message?.name ?? null;
    assistantMessage.provider = provider ?? null;
    assistantMessage.model = model ?? null;
    assistantMessage.finishReason =
      terminalChunk?.finishReason ?? finalMessageChunk?.finishReason ?? null;
    const usage =
      (terminalChunk?.usage ?? finalMessageChunk?.usage) as
        | Record<string, unknown>
        | undefined;
    assistantMessage.usage = usage ?? null;
    assistantMessage.metadata =
      finalMessageChunk?.metadata ??
      terminalChunk?.metadata ??
      null;
    assistantMessage.createdAt = new Date();

    await this.db.aiSessionMessages.add(assistantMessage);

    session.provider = provider ?? session.provider;
    session.model = model ?? session.model;
    if (session.title === null) {
      session.title = deriveTitle(input.content);
    }
    session.updatedAt = new Date();

    await this.db.aiSessions.update(session);
    await this.db.saveChanges();

    return assistantMessage;
  }
}
