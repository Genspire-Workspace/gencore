// file: packages\ai\src\application\services\session\generation-service.ts

import { GenError, Scoped } from "@genspire/core";
import type {
  IEditAiUserMessageAndRegenerateInput,
  IGenerateAiSessionTurnInput,
  IRegenerateAiAssistantMessageInput,
} from "../../contracts/ai-session-contracts.js";
import type { IChatGenerationChunk } from "../../../domain/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../../domain/chat/chat-generation-request.js";
import type {
  IAiSessionSettings,
  IAiSessionSseEvent,
} from "../../../domain/session/types/ai-session-types.js";
import {
  AiGenerationRunEntity,
  AiSessionBranchEntity,
  AiSessionMessageEntity,
  AiSessionTimelineEntity,
  AiSessionTimelineTurnEntity,
  AiSessionTurnEntity,
} from "../../../domain/session/index.js";
import { AiSessionDbContext } from "../../../infrastructure/persistence/ai-session-db-context.js";
import { AiGenerationService } from "../generation/ai-generation-service.js";
import {
  cloneTimelinePrefix,
  ensureStreamEnabled,
  getTimelineTurnByTurn,
  listTimelineTurnSnapshots,
  listTurnMessages,
  nextIndex,
  requireAccessibleSession,
  requireTimelineInSession,
  requireTurnInSession,
  resolveGenerationSettings,
  resolveModel,
  resolveProvider,
  resolveSystemPrompt,
  toChatMessages,
  toGenerationRunResponse,
  toMessageResponse,
  toTimelineResponse,
  toTimelineTurnResponse,
  toToolDefinitions,
  validateSessionContent,
} from "./shared.js";

const STREAM_HEARTBEAT_INTERVAL_MS = Number(
  process.env.AI_STREAM_HEARTBEAT_INTERVAL_MS ?? "1000",
);

interface IPreparedTurnContext {
  sessionId: string;
  timelineId: string;
  turn: AiSessionTurnEntity;
  timelineTurn: AiSessionTimelineTurnEntity;
  run: AiGenerationRunEntity;
  request: IChatGenerationRequest;
  userMessage: AiSessionMessageEntity;
}

type ReadNextChunkResult =
  | { kind: "chunk"; result: IteratorResult<IChatGenerationChunk> }
  | { kind: "heartbeat"; toolCallId: string; toolName?: string; elapsedMs: number };

@Scoped()
export class AiSessionGenerationService {
  static inject = [AiSessionDbContext, AiGenerationService];

  constructor(
    private readonly db: AiSessionDbContext,
    private readonly generationService: AiGenerationService,
  ) {}

  async *generate(input: IGenerateAiSessionTurnInput): AsyncIterable<IAiSessionSseEvent> {
    ensureStreamEnabled(input.settings);
    validateSessionContent(input.content);
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    await requireTimelineInSession(this.db, session, input.timelineId);
    const prepared = await this.prepareTurn({
      sessionId: session.id,
      timelineId: input.timelineId,
      content: input.content,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      timelineTurnSource: input.timelineTurnSource ?? "original",
    });

    yield* this.streamPreparedTurn(prepared);
  }

  async regenerateAssistant(
    input: IRegenerateAiAssistantMessageInput,
  ): Promise<{
    timeline: ReturnType<typeof toTimelineResponse>;
    branch: Record<string, unknown>;
    stream: AsyncIterable<IAiSessionSseEvent>;
  }> {
    ensureStreamEnabled(input.settings);
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    await requireTimelineInSession(this.db, session, input.timelineId);
    const sourceTurn = await requireTurnInSession(this.db, session, input.sourceTurnId);
    const sourceTimelineTurn = await getTimelineTurnByTurn(this.db, input.timelineId, sourceTurn.id);
    if (!sourceTimelineTurn) {
      throw new GenError("Source turn is not attached to the requested timeline.", "AI_TURN_NOT_IN_TIMELINE");
    }

    const sourceMessages = await listTurnMessages(this.db, sourceTurn.id);
    const sourceUserMessage = sourceMessages.find((message) => message.role === "user");
    if (!sourceUserMessage) {
      throw new GenError("Source turn does not contain a user message.", "AI_REGENERATION_INVALID_SOURCE");
    }

    const branchTimeline = new AiSessionTimelineEntity();
    branchTimeline.id = crypto.randomUUID();
    branchTimeline.sessionId = session.id;
    branchTimeline.name = "Assistant regeneration";
    branchTimeline.isDefault = false;
    branchTimeline.metadata = input.metadata ?? null;
    branchTimeline.createdAt = new Date();
    branchTimeline.updatedAt = new Date();

    const branch = new AiSessionBranchEntity();
    branch.id = crypto.randomUUID();
    branch.sessionId = session.id;
    branch.sourceTimelineId = input.timelineId;
    branch.sourceTurnId = sourceTurn.id;
    branch.sourceTurnIndex = sourceTimelineTurn.index;
    branch.targetTimelineId = branchTimeline.id;
    branch.reason = "assistant_regeneration";
    branch.metadata = input.metadata ?? null;
    branch.createdAt = new Date();
    branch.updatedAt = new Date();

    await this.db.timelines.add(branchTimeline);
    await cloneTimelinePrefix(
      this.db,
      input.timelineId,
      branchTimeline.id,
      session.id,
      sourceTimelineTurn.index - 1,
      "branch_copy",
    );
    await this.db.branches.add(branch);

    const prepared = await this.prepareTurn({
      sessionId: session.id,
      timelineId: branchTimeline.id,
      content: sourceUserMessage.content,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      timelineTurnSource: "regenerated",
    });

    return {
      timeline: toTimelineResponse(branchTimeline),
      branch: {
        id: branch.id,
        sessionId: branch.sessionId,
        sourceTimelineId: branch.sourceTimelineId,
        sourceTurnId: branch.sourceTurnId,
        sourceTurnIndex: branch.sourceTurnIndex,
        targetTimelineId: branch.targetTimelineId,
        reason: branch.reason,
        metadata: branch.metadata ?? undefined,
        createdAt: branch.createdAt.toISOString(),
        updatedAt: branch.updatedAt.toISOString(),
      },
      stream: this.streamPreparedTurn(prepared),
    };
  }

  async editUserAndRegenerate(
    input: IEditAiUserMessageAndRegenerateInput,
  ): Promise<{
    timeline: ReturnType<typeof toTimelineResponse>;
    branch: Record<string, unknown>;
    stream: AsyncIterable<IAiSessionSseEvent>;
  }> {
    ensureStreamEnabled(input.settings);
    validateSessionContent(input.content);
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    await requireTimelineInSession(this.db, session, input.timelineId);
    const sourceTurn = await requireTurnInSession(this.db, session, input.sourceTurnId);
    const sourceTimelineTurn = await getTimelineTurnByTurn(this.db, input.timelineId, sourceTurn.id);
    if (!sourceTimelineTurn) {
      throw new GenError("Source turn is not attached to the requested timeline.", "AI_TURN_NOT_IN_TIMELINE");
    }

    const branchTimeline = new AiSessionTimelineEntity();
    branchTimeline.id = crypto.randomUUID();
    branchTimeline.sessionId = session.id;
    branchTimeline.name = "Edited user regeneration";
    branchTimeline.isDefault = false;
    branchTimeline.metadata = input.metadata ?? null;
    branchTimeline.createdAt = new Date();
    branchTimeline.updatedAt = new Date();

    const branch = new AiSessionBranchEntity();
    branch.id = crypto.randomUUID();
    branch.sessionId = session.id;
    branch.sourceTimelineId = input.timelineId;
    branch.sourceTurnId = sourceTurn.id;
    branch.sourceTurnIndex = sourceTimelineTurn.index;
    branch.targetTimelineId = branchTimeline.id;
    branch.reason = "user_edit_regeneration";
    branch.metadata = input.metadata ?? null;
    branch.createdAt = new Date();
    branch.updatedAt = new Date();

    await this.db.timelines.add(branchTimeline);
    await cloneTimelinePrefix(
      this.db,
      input.timelineId,
      branchTimeline.id,
      session.id,
      sourceTimelineTurn.index - 1,
      "branch_copy",
    );
    await this.db.branches.add(branch);

    const prepared = await this.prepareTurn({
      sessionId: session.id,
      timelineId: branchTimeline.id,
      content: input.content,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      timelineTurnSource: "edited_user",
    });

    return {
      timeline: toTimelineResponse(branchTimeline),
      branch: {
        id: branch.id,
        sessionId: branch.sessionId,
        sourceTimelineId: branch.sourceTimelineId,
        sourceTurnId: branch.sourceTurnId,
        sourceTurnIndex: branch.sourceTurnIndex,
        targetTimelineId: branch.targetTimelineId,
        reason: branch.reason,
        metadata: branch.metadata ?? undefined,
        createdAt: branch.createdAt.toISOString(),
        updatedAt: branch.updatedAt.toISOString(),
      },
      stream: this.streamPreparedTurn(prepared),
    };
  }

  private async prepareTurn(input: {
    sessionId: string;
    timelineId: string;
    content: unknown;
    provider?: string;
    model?: string;
    systemPrompt?: string;
    tools?: IGenerateAiSessionTurnInput["tools"];
    settings?: IGenerateAiSessionTurnInput["settings"];
      metadata?: Record<string, unknown> | null;
      sessionSettings?: IAiSessionSettings;
      timelineTurnSource: AiSessionTimelineTurnEntity["source"];
  }): Promise<IPreparedTurnContext> {
    const session = await this.db.sessions.findById(input.sessionId);
    if (!session) {
      throw new GenError("AI session not found.", "AI_SESSION_NOT_FOUND");
    }

    const snapshots = await listTimelineTurnSnapshots(this.db, input.timelineId);
    const historyMessages = snapshots.flatMap((snapshot) => snapshot.messages);
    const timelineTurns = snapshots.map((snapshot) => snapshot.timelineTurn);
    const now = new Date();

    const turn = new AiSessionTurnEntity();
    turn.id = crypto.randomUUID();
    turn.sessionId = input.sessionId;
    turn.status = "running";
    turn.provider = resolveProvider(session.settings ?? undefined, input.provider) ?? null;
    turn.model = resolveModel(session.settings ?? undefined, input.model) ?? null;
    turn.startedAt = now;
    turn.metadata = input.metadata ?? null;
    turn.createdAt = now;
    turn.updatedAt = now;

    const timelineTurn = new AiSessionTimelineTurnEntity();
    timelineTurn.id = crypto.randomUUID();
    timelineTurn.sessionId = input.sessionId;
    timelineTurn.timelineId = input.timelineId;
    timelineTurn.turnId = turn.id;
    timelineTurn.index = nextIndex(timelineTurns);
    timelineTurn.source = input.timelineTurnSource;
    timelineTurn.createdAt = now;
    timelineTurn.updatedAt = now;

    const userMessage = new AiSessionMessageEntity();
    userMessage.id = crypto.randomUUID();
    userMessage.sessionId = input.sessionId;
    userMessage.turnId = turn.id;
    userMessage.index = 0;
    userMessage.role = "user";
    userMessage.content = input.content;
    userMessage.metadata = input.metadata ?? null;
    userMessage.createdAt = now;
    userMessage.updatedAt = now;

    const run = new AiGenerationRunEntity();
    run.id = crypto.randomUUID();
    run.sessionId = input.sessionId;
    run.timelineId = input.timelineId;
    run.turnId = turn.id;
    run.status = "running";
    run.provider = turn.provider;
    run.model = turn.model;
    run.startedAt = now;
    run.metadata = input.metadata ?? null;
    run.createdAt = now;
    run.updatedAt = now;

    await this.db.turns.add(turn);
    await this.db.timelineTurns.add(timelineTurn);
    await this.db.messages.add(userMessage);
    await this.db.generationRuns.add(run);
    await this.db.saveChanges();

    const request: IChatGenerationRequest = {
      provider: resolveProvider(session.settings ?? undefined, input.provider),
      model: resolveModel(session.settings ?? undefined, input.model),
      settings: resolveGenerationSettings(
        session.settings ?? undefined,
        input.settings,
      ),
      messages: [
        ...(resolveSystemPrompt(session.settings ?? undefined, input.systemPrompt)
          ? [{
            role: "system" as const,
            content: resolveSystemPrompt(session.settings ?? undefined, input.systemPrompt)!,
          }]
          : []),
        ...toChatMessages(historyMessages),
        {
          role: "user",
          content: input.content as IChatGenerationRequest["messages"][number]["content"],
        },
      ],
      tools: toToolDefinitions(input.tools),
      metadata: input.metadata ?? undefined,
    };

    return {
      sessionId: input.sessionId,
      timelineId: input.timelineId,
      turn,
      timelineTurn,
      run,
      request,
      userMessage,
    };
  }

  private async *streamPreparedTurn(
    prepared: IPreparedTurnContext,
  ): AsyncIterable<IAiSessionSseEvent> {
    yield {
      type: "started",
      sessionId: prepared.sessionId,
      timelineId: prepared.timelineId,
      turnId: prepared.turn.id,
      timelineTurnId: prepared.timelineTurn.id,
      generationRunId: prepared.run.id,
      messageId: prepared.userMessage.id,
      provider: prepared.request.provider,
      model: prepared.request.model,
    };

    let terminalChunk: IChatGenerationChunk | null = null;
    let finalMessageChunk: IChatGenerationChunk | null = null;
    let accumulatedText = "";
    const toolResults: Array<NonNullable<IChatGenerationChunk["toolResult"]>> = [];
    const toolCalls: Array<NonNullable<IChatGenerationChunk["toolCall"]>> = [];

    try {
      const iterator = this.generationService.streamChat(prepared.request)[Symbol.asyncIterator]();
      const pendingTools = new Map<string, { startedAt: number; toolName?: string }>();

      while (true) {
        const nextChunk = await this.readNextChunkWithHeartbeats(
          iterator,
          pendingTools,
          prepared,
        );
        if (nextChunk.kind === "heartbeat") {
          yield {
            type: "heartbeat",
            sessionId: prepared.sessionId,
            timelineId: prepared.timelineId,
            turnId: prepared.turn.id,
            timelineTurnId: prepared.timelineTurn.id,
            generationRunId: prepared.run.id,
            provider: prepared.request.provider,
            model: prepared.request.model,
            phase: "tool_execution",
            elapsedMs: nextChunk.elapsedMs,
            metadata: nextChunk.toolName
              ? { toolCallId: nextChunk.toolCallId, toolName: nextChunk.toolName }
              : { toolCallId: nextChunk.toolCallId },
          };
          continue;
        }

        if (nextChunk.result.done) {
          break;
        }

        const chunk = nextChunk.result.value;
        terminalChunk = chunk;
        if (chunk.message) {
          finalMessageChunk = chunk;
        }
        if (chunk.delta) {
          accumulatedText += chunk.delta;
          yield {
            type: "delta",
            sessionId: prepared.sessionId,
            timelineId: prepared.timelineId,
            turnId: prepared.turn.id,
            timelineTurnId: prepared.timelineTurn.id,
            generationRunId: prepared.run.id,
            delta: chunk.delta,
            provider: chunk.provider,
            model: chunk.model,
            id: chunk.id,
            metadata: chunk.metadata,
          };
        }
        if (chunk.reasoningDelta) {
          yield {
            type: "reasoning_delta",
            sessionId: prepared.sessionId,
            timelineId: prepared.timelineId,
            turnId: prepared.turn.id,
            timelineTurnId: prepared.timelineTurn.id,
            generationRunId: prepared.run.id,
            reasoningDelta: chunk.reasoningDelta,
            provider: chunk.provider,
            model: chunk.model,
            id: chunk.id,
            metadata: chunk.metadata,
          };
        }
        if (chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
          if (chunk.toolCall.id) {
            pendingTools.set(chunk.toolCall.id, {
              startedAt: Date.now(),
              toolName: chunk.toolCall.name,
            });
          }
          yield {
            type: "tool_call",
            sessionId: prepared.sessionId,
            timelineId: prepared.timelineId,
            turnId: prepared.turn.id,
            timelineTurnId: prepared.timelineTurn.id,
            generationRunId: prepared.run.id,
            toolCall: chunk.toolCall,
            provider: chunk.provider,
            model: chunk.model,
            id: chunk.id,
            metadata: chunk.metadata,
          };
        }
        if (chunk.toolResult) {
          toolResults.push(chunk.toolResult);
          if (chunk.toolResult.toolCallId) {
            pendingTools.delete(chunk.toolResult.toolCallId);
          }
          yield {
            type: "tool_result",
            sessionId: prepared.sessionId,
            timelineId: prepared.timelineId,
            turnId: prepared.turn.id,
            timelineTurnId: prepared.timelineTurn.id,
            generationRunId: prepared.run.id,
            toolResult: chunk.toolResult,
            provider: chunk.provider,
            model: chunk.model,
            id: chunk.id,
            metadata: chunk.metadata,
          };
        }
      }

      const assistantMessage = await this.finalizeSuccess(
        prepared,
        finalMessageChunk,
        terminalChunk,
        accumulatedText,
        toolCalls,
        toolResults,
      );

      yield {
        type: "message",
        sessionId: prepared.sessionId,
        timelineId: prepared.timelineId,
        turnId: prepared.turn.id,
        timelineTurnId: prepared.timelineTurn.id,
        generationRunId: prepared.run.id,
        messageId: assistantMessage.id,
        provider: assistantMessage.provider ?? undefined,
        model: assistantMessage.model ?? undefined,
        message: toMessageResponse(assistantMessage),
        finishReason: prepared.turn.finishReason ?? undefined,
        usage: prepared.run.usage ?? undefined,
        metadata: assistantMessage.metadata ?? undefined,
      };

      yield {
        type: "completed",
        sessionId: prepared.sessionId,
        timelineId: prepared.timelineId,
        turnId: prepared.turn.id,
        timelineTurnId: prepared.timelineTurn.id,
        generationRunId: prepared.run.id,
        provider: prepared.turn.provider ?? undefined,
        model: prepared.turn.model ?? undefined,
        finishReason: prepared.turn.finishReason ?? undefined,
        usage: prepared.run.usage ?? undefined,
        metadata: prepared.run.metadata ?? undefined,
      };
    } catch (error) {
      await this.finalizeFailure(prepared, error);
      yield {
        type: "error",
        sessionId: prepared.sessionId,
        timelineId: prepared.timelineId,
        turnId: prepared.turn.id,
        timelineTurnId: prepared.timelineTurn.id,
        generationRunId: prepared.run.id,
        provider: prepared.request.provider,
        model: prepared.request.model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readNextChunkWithHeartbeats(
    iterator: AsyncIterator<IChatGenerationChunk>,
    pendingTools: ReadonlyMap<string, { startedAt: number; toolName?: string }>,
    prepared: IPreparedTurnContext,
  ): Promise<ReadNextChunkResult> {
    if (STREAM_HEARTBEAT_INTERVAL_MS <= 0 || pendingTools.size === 0) {
      return {
        kind: "chunk",
        result: await iterator.next(),
      };
    }

    const nextPromise = iterator.next();
    while (true) {
      const result = await Promise.race<
        | { kind: "chunk"; result: IteratorResult<IChatGenerationChunk> }
        | { kind: "heartbeat" }
      >([
        nextPromise.then((value) => ({ kind: "chunk" as const, result: value })),
        Bun.sleep(STREAM_HEARTBEAT_INTERVAL_MS).then(() => ({ kind: "heartbeat" as const })),
      ]);

      if (result.kind === "chunk") {
        return result;
      }

      for (const [toolCallId, pendingTool] of pendingTools.entries()) {
        return {
          kind: "heartbeat",
          toolCallId,
          toolName: pendingTool.toolName,
          elapsedMs: Date.now() - pendingTool.startedAt,
        };
      }
    }
  }

  private async finalizeSuccess(
    prepared: IPreparedTurnContext,
    finalMessageChunk: IChatGenerationChunk | null,
    terminalChunk: IChatGenerationChunk | null,
    accumulatedText: string,
    toolCalls: unknown[],
    toolResults: Array<NonNullable<IChatGenerationChunk["toolResult"]>>,
  ) {
    const now = new Date();
    const assistantMessage = new AiSessionMessageEntity();
    assistantMessage.id = crypto.randomUUID();
    assistantMessage.sessionId = prepared.sessionId;
    assistantMessage.turnId = prepared.turn.id;
    assistantMessage.index = 1;
    assistantMessage.role = "assistant";
    assistantMessage.content = finalMessageChunk?.message?.content ?? accumulatedText;
    assistantMessage.name = finalMessageChunk?.message?.name ?? null;
    assistantMessage.provider = terminalChunk?.provider ?? prepared.request.provider ?? null;
    assistantMessage.model = terminalChunk?.model ?? prepared.request.model ?? null;
    assistantMessage.usage =
      (terminalChunk?.usage as Record<string, unknown> | undefined) ??
      (finalMessageChunk?.usage as Record<string, unknown> | undefined) ??
      null;
    assistantMessage.toolCalls = toolCalls.length ? toolCalls : null;
    assistantMessage.toolResults = toolResults.length ? toolResults : null;
    assistantMessage.metadata = finalMessageChunk?.metadata ?? terminalChunk?.metadata ?? null;
    assistantMessage.createdAt = now;
    assistantMessage.updatedAt = now;

    prepared.turn.status = "completed";
    prepared.turn.provider = assistantMessage.provider;
    prepared.turn.model = assistantMessage.model;
    prepared.turn.finishedAt = now;
    prepared.turn.durationMs = prepared.turn.startedAt
      ? now.getTime() - prepared.turn.startedAt.getTime()
      : null;
    prepared.turn.finishReason = terminalChunk?.finishReason ?? finalMessageChunk?.finishReason ?? null;
    prepared.turn.updatedAt = now;

    prepared.run.status = "completed";
    prepared.run.provider = assistantMessage.provider;
    prepared.run.model = assistantMessage.model;
    prepared.run.finishedAt = now;
    prepared.run.durationMs = prepared.run.startedAt
      ? now.getTime() - prepared.run.startedAt.getTime()
      : null;
    prepared.run.finishReason = prepared.turn.finishReason;
    prepared.run.usage = assistantMessage.usage;
    prepared.run.updatedAt = now;

    await this.db.messages.add(assistantMessage);

    let messageIndex = 2;
    for (const toolResult of toolResults) {
      const toolMessage = new AiSessionMessageEntity();
      toolMessage.id = crypto.randomUUID();
      toolMessage.sessionId = prepared.sessionId;
      toolMessage.turnId = prepared.turn.id;
      toolMessage.index = messageIndex;
      toolMessage.role = "tool";
      toolMessage.content = toolResult.result ?? null;
      toolMessage.name = toolResult.name ?? null;
      toolMessage.provider = assistantMessage.provider;
      toolMessage.model = assistantMessage.model;
      toolMessage.metadata = null;
      toolMessage.createdAt = now;
      toolMessage.updatedAt = now;
      await this.db.messages.add(toolMessage);
      messageIndex += 1;
    }

    await this.db.turns.update(prepared.turn);
    await this.db.generationRuns.update(prepared.run);

    const session = await this.db.sessions.findById(prepared.sessionId);
    if (session) {
      session.updatedAt = now;
      if (!session.title) {
        session.title = "AI session";
      }
      await this.db.sessions.update(session);
    }

    await this.db.saveChanges();
    return assistantMessage;
  }

  private async finalizeFailure(
    prepared: IPreparedTurnContext,
    error: unknown,
  ): Promise<void> {
    const now = new Date();
    const message = error instanceof Error ? error.message : String(error);

    prepared.turn.status = "failed";
    prepared.turn.finishedAt = now;
    prepared.turn.durationMs = prepared.turn.startedAt
      ? now.getTime() - prepared.turn.startedAt.getTime()
      : null;
    prepared.turn.error = message;
    prepared.turn.updatedAt = now;

    prepared.run.status = "failed";
    prepared.run.finishedAt = now;
    prepared.run.durationMs = prepared.run.startedAt
      ? now.getTime() - prepared.run.startedAt.getTime()
      : null;
    prepared.run.error = message;
    prepared.run.updatedAt = now;

    await this.db.turns.update(prepared.turn);
    await this.db.generationRuns.update(prepared.run);
    await this.db.saveChanges();
  }
}
