// file: packages\ai\src\application\services\session\generation-service.ts

import { EventBus, GenError, Scoped } from "@genspire/core";
import type {
  IEditAiUserMessageAndRegenerateInput,
  IGenerateAiSessionTurnInput,
  IRegenerateAiAssistantMessageInput,
} from "../../contracts/ai-session-contracts.js";
import type { IChatGenerationChunk } from "../../../domain/chat/chat-generation-chunk.js";
import type { IChatMessage } from "../../../domain/chat/chat-message.js";
import type { IChatGenerationRequest } from "../../../domain/chat/chat-generation-request.js";
import type { AiContentPart, AiMessageContent } from "../../../domain/messages/ai-content-part.js";
import type {
  IAiSessionSettings,
  IAiSessionPromptReference,
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
import { AiTokenizerService } from "../tokenizer/tokenizer-service.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";
import { AiSessionDbContext } from "../../../infrastructure/persistence/ai-session-db-context.js";
import { AiGenerationService } from "../generation/ai-generation-service.js";
import {
  cloneTimelinePrefix,
  ensureStreamEnabled,
  getTimelineTurnByTurn,
  listTimelineTurnSnapshots,
  listTurnMessages,
  nextIndex,
  promoteSessionDefaultTimeline,
  requireAccessibleSession,
  requireTimelineInSession,
  requireTurnInSession,
  resolveGenerationSettings,
  resolveModel,
  resolveProvider,
  resolveSystemPrompt,
  toMessageResponse,
  toTimelineResponse,
  toToolDefinitions,
  validateSessionContent,
  validateSessionTitle,
} from "./shared.js";
import {
  DEFAULT_SESSION_SYSTEM_PROMPT_NAME,
  DEFAULT_SESSION_TITLE_PROMPT_NAME,
  requestAiPrompt,
} from "../../prompts/default-session-prompts.js";

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
  currentUser: IGenerateAiSessionTurnInput["currentUser"];
  shouldGenerateTitle: boolean;
  promoteTimelineOnFinalize?: boolean;
}

type ReadNextChunkResult =
  | { kind: "chunk"; result: IteratorResult<IChatGenerationChunk> }
  | { kind: "title_renamed"; event: IAiSessionSseEvent | null }
  | { kind: "heartbeat"; toolCallId: string; toolName?: string; elapsedMs: number };

@Scoped()
export class AiSessionGenerationService {
  static inject = [AiSessionDbContext, AiProviderDbContext, AiGenerationService, EventBus];

  private readonly tokenizer = new AiTokenizerService();

  constructor(
    private readonly db: AiSessionDbContext,
    private readonly providerDb: AiProviderDbContext,
    private readonly generationService: AiGenerationService,
    private readonly eventBus: EventBus,
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
      signal: input.signal,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      currentUser: input.currentUser,
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
    branchTimeline.previousTimelineId = input.timelineId;
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
      signal: input.signal,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      currentUser: input.currentUser,
      timelineTurnSource: "regenerated",
      promoteTimelineOnFinalize: true,
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
    branchTimeline.previousTimelineId = input.timelineId;
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
      signal: input.signal,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      settings: input.settings,
      metadata: input.metadata,
      sessionSettings: session.settings ?? undefined,
      currentUser: input.currentUser,
      timelineTurnSource: "edited_user",
      promoteTimelineOnFinalize: true,
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
    signal?: AbortSignal;
    provider?: string;
    model?: string;
    systemPrompt?: string;
    tools?: IGenerateAiSessionTurnInput["tools"];
    settings?: IGenerateAiSessionTurnInput["settings"];
    metadata?: Record<string, unknown> | null;
    sessionSettings?: IAiSessionSettings;
    currentUser: IGenerateAiSessionTurnInput["currentUser"];
    timelineTurnSource: AiSessionTimelineTurnEntity["source"];
    promoteTimelineOnFinalize?: boolean;
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

    const provider = resolveProvider(session.settings ?? undefined, input.provider);
    const model = resolveModel(session.settings ?? undefined, input.model);
    const settings = resolveGenerationSettings(
      session.settings ?? undefined,
      input.settings,
    );
    const systemPrompt = resolveSystemPrompt([
      await this.resolveStoredSystemPrompt(input.sessionSettings, input.currentUser),
      input.sessionSettings?.systemPrompt,
      input.systemPrompt,
    ]);
    const historyRequestMessages = await this.buildHistoryRequestMessages({
      provider,
      model,
      settings,
      systemPrompt,
      historyMessages,
      requestContent: input.content as IChatGenerationRequest["messages"][number]["content"],
    });

    const request: IChatGenerationRequest = {
      provider,
      model,
      settings,
      messages: [
        ...(systemPrompt
          ? [{
            role: "system" as const,
            content: systemPrompt,
          }]
          : []),
        ...historyRequestMessages,
        {
          role: "user",
          content: input.content as IChatGenerationRequest["messages"][number]["content"],
        },
      ],
      tools: toToolDefinitions(input.tools),
      metadata: input.metadata ?? undefined,
      signal: input.signal,
    };

    return {
      sessionId: input.sessionId,
      timelineId: input.timelineId,
      turn,
      timelineTurn,
      run,
      request,
      userMessage,
      currentUser: input.currentUser,
      shouldGenerateTitle:
        timelineTurn.index === 0 && input.timelineTurnSource === "original",
      promoteTimelineOnFinalize: input.promoteTimelineOnFinalize,
    };
  }

  private async resolveStoredSystemPrompt(
    sessionSettings: IAiSessionSettings | undefined,
    currentUser: IGenerateAiSessionTurnInput["currentUser"],
  ): Promise<string | undefined> {
    const prompt = await requestAiPrompt(this.eventBus, {
      currentUser,
      reference: this.resolvePromptReference(
        sessionSettings?.prompts?.systemPrompt,
        DEFAULT_SESSION_SYSTEM_PROMPT_NAME,
      ),
    });

    if (!prompt || typeof prompt.template !== "string") {
      return undefined;
    }

    const template = prompt.template.trim();
    return template.length > 0 ? template : undefined;
  }

  private resolvePromptReference(
    reference: IAiSessionPromptReference | undefined,
    fallbackName: string,
  ): IAiSessionPromptReference {
    const id = reference?.id?.trim();
    const name = reference?.name?.trim();

    return {
      ...(id ? { id } : {}),
      ...(name ? { name } : { name: fallbackName }),
    };
  }

  private async tryGenerateSessionTitle(
    prepared: IPreparedTurnContext,
  ): Promise<IAiSessionSseEvent | null> {
    if (!prepared.shouldGenerateTitle) {
      return null;
    }

    const session = await this.db.sessions.findById(prepared.sessionId);
    if (!session) {
      return null;
    }

    if (session.title && session.title.trim() && session.title.trim() !== "AI session") {
      return null;
    }

    const prompt = await requestAiPrompt(this.eventBus, {
      currentUser: prepared.currentUser,
      reference: this.resolvePromptReference(
        session.settings?.prompts?.titleGeneratorPrompt,
        DEFAULT_SESSION_TITLE_PROMPT_NAME,
      ),
    });

    if (!prompt || typeof prompt.template !== "string") {
      return null;
    }

    const userMessageText = this.toTextOnlyHistoryContent(
      prepared.userMessage.content as AiMessageContent,
    );
    if (!userMessageText) {
      return null;
    }

    const response = await this.generationService.generateChat({
      provider: prepared.request.provider,
      model: prepared.request.model,
      messages: [
        { role: "system", content: prompt.template },
        { role: "user", content: userMessageText },
      ],
      settings: {
        reasoningEffort: "none",
        temperature: 0.2,
        maxTokens: 32,
      },
      metadata: {
        source: "session-title-generation",
        sessionId: prepared.sessionId,
      },
    });

    const title = validateSessionTitle(
      this.normalizeGeneratedSessionTitle(
        this.toTextOnlyHistoryContent(response.message.content),
      ),
    );
    if (!title) {
      return null;
    }

    const latestSession = await this.db.sessions.findById(prepared.sessionId);
    if (!latestSession) {
      return null;
    }

    if (
      latestSession.title &&
      latestSession.title.trim() &&
      latestSession.title.trim() !== "AI session"
    ) {
      return null;
    }

    latestSession.title = title;
    latestSession.updatedAt = new Date();
    await this.db.sessions.update(latestSession);
    await this.db.saveChanges();

    return {
      type: "session_renamed",
      sessionId: latestSession.id,
      session: {
        id: latestSession.id,
        userId: latestSession.userId,
        title: latestSession.title ?? undefined,
        type: latestSession.type,
        defaultTimelineId: latestSession.defaultTimelineId ?? undefined,
        settings: latestSession.settings ?? undefined,
        metadata: latestSession.metadata ?? undefined,
        createdAt: latestSession.createdAt.toISOString(),
        updatedAt: latestSession.updatedAt.toISOString(),
      },
    };
  }

  private normalizeGeneratedSessionTitle(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const firstLine = value.split(/\r?\n/u)[0]?.trim() ?? "";
    const unquoted = firstLine.replace(/^["'\s]+|["'\s]+$/gu, "");
    return unquoted.replace(/[.!?]+$/u, "").trim();
  }

  private async buildHistoryRequestMessages(input: {
    provider?: string;
    model?: string;
    settings?: IPreparedTurnContext["request"]["settings"];
    systemPrompt?: string;
    historyMessages: AiSessionMessageEntity[];
    requestContent: IChatGenerationRequest["messages"][number]["content"];
  }): Promise<IChatMessage[]> {
    const textOnlyHistory = input.historyMessages
      .map((message) => this.toTextOnlyHistoryMessage(message))
      .filter((message): message is IChatMessage => message !== null);

    const maxContextTokens = await this.resolveMaxContextTokens(input.provider, input.model, input.settings?.maxTokens);
    if (!maxContextTokens) {
      return textOnlyHistory;
    }

    const reservedTokens =
      this.countMessageTokens(
        { role: "user", content: input.requestContent },
        input.model,
        input.provider,
      ) + (
        input.systemPrompt
          ? this.countMessageTokens(
            { role: "system", content: input.systemPrompt },
            input.model,
            input.provider,
          )
          : 0
      );

    const remainingHistoryBudget = maxContextTokens - reservedTokens;
    if (remainingHistoryBudget <= 0) {
      return [];
    }

    const selected: IChatMessage[] = [];
    let consumedTokens = 0;

    for (let index = textOnlyHistory.length - 1; index >= 0; index -= 1) {
      const message = textOnlyHistory[index]!;
      const messageTokens = this.countMessageTokens(message, input.model, input.provider);
      if (messageTokens <= 0) {
        continue;
      }

      if (consumedTokens + messageTokens > remainingHistoryBudget) {
        break;
      }

      consumedTokens += messageTokens;
      selected.push(message);
    }

    return selected.reverse();
  }

  private async resolveMaxContextTokens(
    providerId: string | undefined,
    modelName: string | undefined,
    sessionMaxTokens: number | undefined,
  ): Promise<number | undefined> {
    const modelMaxTokens = await this.resolveModelMaxInputTokens(providerId, modelName);
    const candidates = [sessionMaxTokens, modelMaxTokens].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );

    return candidates.length > 0 ? Math.max(...candidates) : undefined;
  }

  private async resolveModelMaxInputTokens(
    providerId: string | undefined,
    modelName: string | undefined,
  ): Promise<number | undefined> {
    const normalizedProviderId = providerId?.trim();
    const normalizedModelName = modelName?.trim().toLowerCase();
    if (!normalizedProviderId || !normalizedModelName) {
      return undefined;
    }

    const models = await this.providerDb.models.list({
      where: { providerId: normalizedProviderId },
    });
    const model = models.find((candidate) => candidate.name.trim().toLowerCase() === normalizedModelName);
    const maxTokens = model?.capabilities?.maxTextInputTokens;

    return typeof maxTokens === "number" && Number.isFinite(maxTokens) && maxTokens > 0
      ? Math.floor(maxTokens)
      : undefined;
  }

  private toTextOnlyHistoryMessage(message: AiSessionMessageEntity): IChatMessage | null {
    const content = this.toTextOnlyHistoryContent(message.content as AiMessageContent);
    if (!content) {
      return null;
    }

    return {
      role: message.role,
      content,
      ...(message.name ? { name: message.name } : {}),
      ...(message.metadata ? { metadata: message.metadata } : {}),
    };
  }

  private toTextOnlyHistoryContent(content: AiMessageContent): string | null {
    if (typeof content === "string") {
      const normalized = content.trim();
      return normalized.length > 0 ? normalized : null;
    }

    const text = content
      .flatMap((part) => this.collectTextParts(part))
      .join("\n")
      .trim();

    return text.length > 0 ? text : null;
  }

  private collectTextParts(part: AiContentPart): string[] {
    return part.type === "text" && part.text.trim().length > 0
      ? [part.text]
      : [];
  }

  private countMessageTokens(
    message: IChatMessage,
    model: string | undefined,
    provider: string | undefined,
  ): number {
    return this.tokenizer.countTokens(this.serializeContentForTokenCount(message.content), {
      model,
      providerSelection: provider && model ? `${provider}:${model}` : undefined,
    }).tokenCount;
  }

  private serializeContentForTokenCount(content: AiMessageContent): string {
    if (typeof content === "string") {
      return content;
    }

    return content
      .map((part) => this.serializePartForTokenCount(part))
      .filter((value) => value.length > 0)
      .join(" ");
  }

  private serializePartForTokenCount(part: AiContentPart): string {
    switch (part.type) {
      case "text":
        return part.text;
      case "thinking":
        return part.redacted ? "[redacted thinking]" : part.text;
      case "tool_call":
        return `${part.name}(${JSON.stringify(part.arguments ?? {})})`;
      case "tool_result":
        return this.serializeContentForTokenCount(part.content);
      case "image":
        return "[image]";
      case "file":
        return "[file]";
      default:
        return "";
    }
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
    const titleRenameTask = this.startSessionTitleRenameTask(prepared);
    let titleRenamePending = titleRenameTask != null;
    let titleRenameEmitted = false;

    try {
      const iterator = this.generationService.streamChat(prepared.request)[Symbol.asyncIterator]();
      const pendingTools = new Map<string, { startedAt: number; toolName?: string }>();

      while (true) {
        const nextChunk = await this.readNextChunkWithHeartbeats(
          iterator,
          pendingTools,
          prepared,
          titleRenamePending ? titleRenameTask : null,
        );
        if (nextChunk.kind === "title_renamed") {
          titleRenamePending = false;
          if (nextChunk.event) {
            titleRenameEmitted = true;
            yield nextChunk.event;
          }
          continue;
        }
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

      if (titleRenamePending && titleRenameTask) {
        titleRenamePending = false;
        const titleRenameEvent = await titleRenameTask;
        if (titleRenameEvent) {
          titleRenameEmitted = true;
          yield titleRenameEvent;
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
      if (titleRenamePending && titleRenameTask) {
        titleRenamePending = false;
        try {
          const titleRenameEvent = await titleRenameTask;
          if (titleRenameEvent && !titleRenameEmitted) {
            yield titleRenameEvent;
          }
        } catch {
          // Ignore title-generation failures so the primary generation path wins.
        }
      }
      if (this.isAbortError(error)) {
        await this.finalizeAbort(
          prepared,
          finalMessageChunk,
          terminalChunk,
          accumulatedText,
          toolCalls,
          toolResults,
        );
        return;
      }

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

  private startSessionTitleRenameTask(
    prepared: IPreparedTurnContext,
  ): Promise<IAiSessionSseEvent | null> | null {
    if (!prepared.shouldGenerateTitle) {
      return null;
    }

    return this.tryGenerateSessionTitle(prepared).catch(() => null);
  }

  private async readNextChunkWithHeartbeats(
    iterator: AsyncIterator<IChatGenerationChunk>,
    pendingTools: ReadonlyMap<string, { startedAt: number; toolName?: string }>,
    prepared: IPreparedTurnContext,
    titleRenameTask: Promise<IAiSessionSseEvent | null> | null,
  ): Promise<ReadNextChunkResult> {
    if (STREAM_HEARTBEAT_INTERVAL_MS <= 0 || pendingTools.size === 0) {
      const nextPromise = iterator.next();
      if (!titleRenameTask) {
        return {
          kind: "chunk",
          result: await nextPromise,
        };
      }

      return await Promise.race<ReadNextChunkResult>([
        nextPromise.then((result) => ({ kind: "chunk" as const, result })),
        titleRenameTask.then((event) => ({ kind: "title_renamed" as const, event })),
      ]);
    }

    const nextPromise = iterator.next();
    while (true) {
      const result = await Promise.race<
        | { kind: "chunk"; result: IteratorResult<IChatGenerationChunk> }
        | { kind: "title_renamed"; event: IAiSessionSseEvent | null }
        | { kind: "heartbeat" }
      >([
        nextPromise.then((value) => ({ kind: "chunk" as const, result: value })),
        ...(titleRenameTask
          ? [titleRenameTask.then((event) => ({ kind: "title_renamed" as const, event }))]
          : []),
        Bun.sleep(STREAM_HEARTBEAT_INTERVAL_MS).then(() => ({ kind: "heartbeat" as const })),
      ]);

      if (result.kind === "chunk") {
        return result;
      }

      if (result.kind === "title_renamed") {
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
    const assistantMessage = this.createAssistantMessage(
      prepared,
      finalMessageChunk,
      terminalChunk,
      accumulatedText,
      toolCalls,
      toolResults,
      now,
    );

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
      if (prepared.promoteTimelineOnFinalize) {
        await promoteSessionDefaultTimeline(this.db, session, prepared.timelineId);
      }
      if (!session.title) {
        session.title = "AI session";
      }
      session.updatedAt = now;
      await this.db.sessions.update(session);
    }

    await this.db.saveChanges();
    return assistantMessage;
  }

  private async finalizeAbort(
    prepared: IPreparedTurnContext,
    finalMessageChunk: IChatGenerationChunk | null,
    terminalChunk: IChatGenerationChunk | null,
    accumulatedText: string,
    toolCalls: unknown[],
    toolResults: Array<NonNullable<IChatGenerationChunk["toolResult"]>>,
  ): Promise<void> {
    const now = new Date();
    const assistantMessage = this.createAssistantMessage(
      prepared,
      finalMessageChunk,
      terminalChunk,
      accumulatedText,
      toolCalls,
      toolResults,
      now,
    );

    prepared.turn.status = "aborted";
    prepared.turn.provider = assistantMessage.provider;
    prepared.turn.model = assistantMessage.model;
    prepared.turn.finishedAt = now;
    prepared.turn.durationMs = prepared.turn.startedAt
      ? now.getTime() - prepared.turn.startedAt.getTime()
      : null;
    prepared.turn.finishReason = "aborted";
    prepared.turn.error = null;
    prepared.turn.updatedAt = now;

    prepared.run.status = "aborted";
    prepared.run.provider = assistantMessage.provider;
    prepared.run.model = assistantMessage.model;
    prepared.run.finishedAt = now;
    prepared.run.durationMs = prepared.run.startedAt
      ? now.getTime() - prepared.run.startedAt.getTime()
      : null;
    prepared.run.finishReason = "aborted";
    prepared.run.usage = assistantMessage.usage;
    prepared.run.error = null;
    prepared.run.updatedAt = now;

    await this.persistAssistantArtifacts(prepared, assistantMessage, toolResults, now);
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

  private createAssistantMessage(
    prepared: IPreparedTurnContext,
    finalMessageChunk: IChatGenerationChunk | null,
    terminalChunk: IChatGenerationChunk | null,
    accumulatedText: string,
    toolCalls: unknown[],
    toolResults: Array<NonNullable<IChatGenerationChunk["toolResult"]>>,
    now: Date,
  ): AiSessionMessageEntity {
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
    return assistantMessage;
  }

  private async persistAssistantArtifacts(
    prepared: IPreparedTurnContext,
    assistantMessage: AiSessionMessageEntity,
    toolResults: Array<NonNullable<IChatGenerationChunk["toolResult"]>>,
    now: Date,
  ): Promise<void> {
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
      if (prepared.promoteTimelineOnFinalize) {
        await promoteSessionDefaultTimeline(this.db, session, prepared.timelineId);
      }
      if (!session.title) {
        session.title = "AI session";
      }
      session.updatedAt = now;
      await this.db.sessions.update(session);
    }

    await this.db.saveChanges();
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof DOMException && error.name === "AbortError"
    ) || (
      error instanceof Error && error.name === "AbortError"
    );
  }
}
