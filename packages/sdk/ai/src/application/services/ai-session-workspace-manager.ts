import type { AiContentPart } from "@genspire/ai/domain/messages";
import type {
  IAiSessionActiveSessionStore,
  IAiSessionAttachment,
  IAiSessionClientState,
  IAiSessionEditingDraft,
  IAiSessionGraphDto,
  IAiSessionMessageFeedbackValue,
  IAiSessionResponseDto,
  IAiSessionStreamEvent,
  IAiSessionViewMessage,
  IAiSessionViewMessageActions,
  IAiSessionWorkspaceOptions,
  IAiSessionWorkspaceSnapshot,
} from "../../domain/types/ai-session-sdk-types.js";
import type { IAiSessionTransport } from "../contracts/ai-session-transport.js";
import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  resolveAiSessionAssistantText,
} from "./ai-session-stream.js";

const DEFAULT_ABORT_REFRESH_ATTEMPTS = 4;
const DEFAULT_ABORT_REFRESH_DELAY_MS = 75;

export class AiSessionWorkspaceManager {
  private readonly listeners = new Set<() => void>();
  private readonly defaultProvider: string;
  private readonly defaultModel: string;
  private readonly source: string;
  private readonly abortRefreshAttempts: number;
  private readonly abortRefreshDelayMs: number;
  private readonly activeSessionStore: IAiSessionActiveSessionStore | null;

  private snapshot: IAiSessionWorkspaceSnapshot = {
    selectedSessionId: null,
    sessions: [],
    sessionListLoading: false,
    sessionListError: "",
    sessionStatesById: {},
  };

  constructor(
    private readonly transport: IAiSessionTransport,
    options: IAiSessionWorkspaceOptions = {},
  ) {
    this.defaultProvider = options.defaultProvider ?? "";
    this.defaultModel = options.defaultModel ?? "";
    this.source = options.source ?? "sdk-ai";
    this.abortRefreshAttempts =
      options.abortRefreshAttempts ?? DEFAULT_ABORT_REFRESH_ATTEMPTS;
    this.abortRefreshDelayMs =
      options.abortRefreshDelayMs ?? DEFAULT_ABORT_REFRESH_DELAY_MS;
    this.activeSessionStore = options.activeSessionStore ?? null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): IAiSessionWorkspaceSnapshot {
    return this.snapshot;
  }

  getSelectedSessionId(): string | null {
    return this.snapshot.selectedSessionId;
  }

  getCurrentSessionState(): IAiSessionClientState | null {
    const sessionId = this.snapshot.selectedSessionId;
    return sessionId ? this.snapshot.sessionStatesById[sessionId] ?? null : null;
  }

  getSessionState(sessionId: string): IAiSessionClientState | null {
    return this.snapshot.sessionStatesById[sessionId] ?? null;
  }

  getCurrentSession(): IAiSessionResponseDto | null {
    const state = this.getCurrentSessionState();
    if (state?.graph?.session) {
      return state.graph.session;
    }

    const sessionId = this.snapshot.selectedSessionId;
    return sessionId
      ? this.snapshot.sessions.find((session) => session.id === sessionId) ?? null
      : null;
  }

  async reloadSession(): Promise<void> {
    this.patchSnapshot({
      sessionListLoading: true,
      sessionListError: "",
    });

    try {
      await this.reloadSessionListInternal();
      const session = await this.ensureSessionRecord();
      this.selectSession(session.id);
      await this.ensureSessionState(session.id, session);
    } catch (error) {
      this.patchSnapshot({
        sessionListError: this.readErrorMessage(error),
      });
      throw error;
    } finally {
      this.patchSnapshot({
        sessionListLoading: false,
      });
    }
  }

  async newSession(): Promise<void> {
    this.patchSnapshot({
      sessionListLoading: true,
      sessionListError: "",
    });

    try {
      const session = await this.transport.createSession({
        type: "chat",
        settings: this.buildSessionSettings(this.getCurrentSessionState()),
        metadata: {
          source: this.source,
        },
      });
      this.selectSession(session.id);
      this.ensureLocalSessionState(session.id, session);
      await this.refreshSessionGraph(session.id);
      await this.reloadSessionListInternal();
    } catch (error) {
      this.patchSnapshot({
        sessionListError: this.readErrorMessage(error),
      });
      throw error;
    } finally {
      this.patchSnapshot({
        sessionListLoading: false,
      });
    }
  }

  async openSession(sessionId: string): Promise<void> {
    this.patchSnapshot({
      sessionListError: "",
    });
    this.selectSession(sessionId);

    try {
      const session = await this.transport.getSession(sessionId);
      if (!session) {
        await this.reloadSessionListInternal();
        throw new Error("Session was not found.");
      }

      this.ensureLocalSessionState(session.id, session);
      await this.refreshSessionGraph(session.id);
    } catch (error) {
      this.patchSnapshot({
        sessionListError: this.readErrorMessage(error),
      });
      throw error;
    }
  }

  async reloadSessionList(): Promise<void> {
    this.patchSnapshot({
      sessionListLoading: true,
      sessionListError: "",
    });

    try {
      await this.reloadSessionListInternal();
    } catch (error) {
      this.patchSnapshot({
        sessionListError: this.readErrorMessage(error),
      });
      throw error;
    } finally {
      this.patchSnapshot({
        sessionListLoading: false,
      });
    }
  }

  selectSession(sessionId: string | null): void {
    this.patchSnapshot({
      selectedSessionId: sessionId,
    });
    this.activeSessionStore?.setActiveSessionId(sessionId);
  }

  async ensureSessionState(
    sessionId: string,
    session?: IAiSessionResponseDto,
  ): Promise<IAiSessionClientState> {
    const existing = this.getSessionState(sessionId);
    if (existing?.graph) {
      return existing;
    }

    if (session) {
      this.ensureLocalSessionState(sessionId, session);
    }

    await this.refreshSessionGraph(sessionId);
    const next = this.getSessionState(sessionId);
    if (!next) {
      throw new Error("Session state could not be initialized.");
    }

    return next;
  }

  async refreshSessionGraph(sessionId?: string, timelineId?: string): Promise<void> {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      loading: true,
      error: "",
    }));

    try {
      const graph = await this.transport.getSessionGraph(targetSessionId, timelineId);
      this.syncSessionListEntry(graph.session);
      this.patchSessionState(targetSessionId, (current) =>
        this.mergeGraphIntoState(
          graph,
          current ?? this.createSessionState(targetSessionId),
        ),
      );
    } catch (error) {
      this.patchSessionState(targetSessionId, (current) => ({
        ...(current ?? this.createSessionState(targetSessionId)),
        loading: false,
        error: this.readErrorMessage(error),
      }));
      throw error;
    }
  }

  async sendMessage(sessionId?: string): Promise<void> {
    let targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    let session = targetSessionId
      ? this.getSessionState(targetSessionId)?.graph?.session ??
        this.snapshot.sessions.find((item) => item.id === targetSessionId) ??
        null
      : this.getCurrentSession();

    if (!targetSessionId || !session) {
      session = await this.ensureSessionRecord();
      targetSessionId = session.id;
      this.selectSession(targetSessionId);
      await this.ensureSessionState(targetSessionId, session);
    }

    const targetId = targetSessionId;

    const state = this.getSessionState(targetId);
    if (!state) {
      throw new Error("Session state is unavailable.");
    }

    const prompt = state.prompt.trim();
    const attachments = state.attachments;
    if ((prompt.length === 0 && attachments.length === 0) || state.sending) {
      return;
    }

    this.patchSessionState(targetId, (current) => ({
      ...(current ?? this.createSessionState(targetId)),
      sending: true,
      error: "",
      streamStatus: "Waiting for stream...",
    }));

    const timelineId =
      state.activeTimelineId ?? this.resolveTimelineIdFromGraph(state.graph);
    if (!timelineId) {
      throw new Error("Session does not have an active timeline.");
    }

    const nextSettings = this.buildSessionSettings(state);
    if (!this.areSessionSettingsEqual(session, nextSettings)) {
      session = await this.transport.updateSession(session.id, {
        settings: nextSettings,
      });
      this.syncSessionListEntry(session);
    }

    const content = this.buildUserMessageContent(prompt, attachments);
    const editingDraft = state.editingDraft;
    const userMessage: IAiSessionViewMessage = {
      id: `local-user-${Date.now()}`,
      messageId: `local-user-${Date.now()}`,
      sessionId: session.id,
      timelineId,
      turnId: editingDraft?.turnId ?? `local-user-turn-${Date.now()}`,
      index: editingDraft ? -2 : -1,
      role: "user",
      content,
      actions: this.defaultActionsForRole("user"),
    };
    const assistantMessage: IAiSessionViewMessage = {
      id: `local-assistant-${Date.now()}`,
      messageId: `local-assistant-${Date.now()}`,
      sessionId: session.id,
      timelineId,
      turnId: `local-assistant-turn-${Date.now()}`,
      index: -1,
      role: "assistant",
      content: "",
      pending: true,
      actions: this.defaultActionsForRole("assistant"),
    };

    this.patchSessionState(targetId, (current) => ({
      ...(current ?? this.createSessionState(targetId)),
      messages: editingDraft
        ? [
            ...(current?.messages ?? []).filter(
              (message) => message.turnId !== editingDraft.turnId,
            ),
            userMessage,
            assistantMessage,
          ]
        : [...(current?.messages ?? []), userMessage, assistantMessage],
      prompt: "",
      attachments: [],
      editingDraft: null,
    }));

    let assembly = createAiSessionStreamAssembly();
    const streamController = new AbortController();
    this.patchSessionState(targetId, (current) => ({
      ...(current ?? this.createSessionState(targetId)),
      activeStreamController: streamController,
    }));
    const expectedMessageCount = state.messages.length + 2;
    let streamedTimelineId = timelineId;

    try {
      const streamInput = {
        provider: state.provider.trim() || undefined,
        model: state.model.trim() || undefined,
        settings: {
          reasoningEffort: "none" as const,
        },
        metadata: {
          source: this.source,
        },
      };

      const onChunk = (chunk: IAiSessionStreamEvent) => {
        assembly = applyAiSessionStreamChunk(assembly, chunk);
        streamedTimelineId = this.readStartedTimelineId(chunk) ?? streamedTimelineId;

        let streamStatus = "Streaming assistant reply...";
        if (chunk.type === "heartbeat") {
          streamStatus = `Streaming... ${
            this.readHeartbeatToolName(chunk.metadata) ?? "waiting for provider"
          } (${Math.floor((chunk.elapsedMs ?? 0) / 1000)}s)`;
        } else if (chunk.type === "completed") {
          streamStatus = "Stream finished. Reloading saved history...";
        } else if (chunk.type === "error") {
          streamStatus = "Stream returned an error.";
        }

        this.patchSessionState(targetId, (current) => ({
          ...(current ?? this.createSessionState(targetId)),
          activeTimelineId: streamedTimelineId,
          streamStatus,
          messages: (current?.messages ?? []).map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  timelineId: streamedTimelineId,
                  content: resolveAiSessionAssistantText(assembly),
                  pending: !assembly.finished,
                }
              : message,
          ),
        }));
      };

      if (editingDraft) {
        await this.transport.editUserAndRegenerate(
          session.id,
          timelineId,
          {
            sourceTurnId: editingDraft.turnId,
            content,
            ...streamInput,
          },
          onChunk,
          {
            signal: streamController.signal,
          },
        );
      } else {
        await this.transport.streamMessage(
          session.id,
          timelineId,
          {
            content,
            ...streamInput,
          },
          onChunk,
          {
            signal: streamController.signal,
          },
        );
      }

      if (assembly.error) {
        throw new Error(assembly.error);
      }

      await this.refreshSessionGraph(targetId, streamedTimelineId);
      await this.reloadSessionListInternal();
      this.patchSessionState(targetId, (current) => ({
        ...(current ?? this.createSessionState(targetId)),
        streamStatus: "Latest assistant turn saved.",
      }));
    } catch (error) {
      const stopped = this.isAbortError(error);
      this.patchSessionState(targetId, (current) => ({
        ...(current ?? this.createSessionState(targetId)),
        error: stopped ? "" : this.readErrorMessage(error),
        streamStatus: stopped ? "Stream stopped." : "",
        messages: (current?.messages ?? []).map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content:
                  resolveAiSessionAssistantText(assembly) ||
                  (stopped
                    ? "Generation stopped."
                    : "Assistant stream failed."),
                pending: false,
              }
            : message,
        ),
      }));

      if (stopped) {
        await this.refreshSessionGraphUntil(
          targetId,
          streamedTimelineId,
          expectedMessageCount,
        );
        await this.reloadSessionListInternal();
      } else {
        throw error;
      }
    } finally {
      this.patchSessionState(targetId, (current) => ({
        ...(current ?? this.createSessionState(targetId)),
        sending: false,
        activeStreamController:
          current?.activeStreamController === streamController
            ? null
            : current?.activeStreamController ?? null,
      }));
    }
  }

  stopStreaming(sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.getSessionState(targetSessionId)?.activeStreamController?.abort();
  }

  setCurrentPrompt(value: string, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      prompt: value,
    }));
  }

  setCurrentAttachments(
    value: IAiSessionAttachment[],
    sessionId?: string,
  ): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      attachments: value,
    }));
  }

  setCurrentProvider(value: string, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      provider: value,
    }));
  }

  setCurrentModel(value: string, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      model: value,
    }));
  }

  beginEditMessage(message: IAiSessionViewMessage, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId || message.role !== "user") {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      prompt: this.readContentText(message.content),
      attachments: [],
      editingDraft: {
        messageId: message.messageId,
        turnId: message.turnId,
        sessionId: message.sessionId,
        timelineId: message.timelineId,
        originalContent: message.content,
      },
    }));
  }

  cancelEditMessage(sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      editingDraft: null,
    }));
  }

  async submitFeedback(
    message: IAiSessionViewMessage,
    rating: IAiSessionMessageFeedbackValue,
    sessionId?: string,
  ): Promise<void> {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId ?? message.sessionId;
    if (!targetSessionId || message.role !== "assistant") {
      return;
    }

    await this.transport.createFeedback(targetSessionId, message.messageId, {
      rating,
      metadata: {
        source: this.source,
      },
    });
    await this.refreshSessionGraph(targetSessionId, message.timelineId);
  }

  async branchFromMessage(
    message: IAiSessionViewMessage,
    sessionId?: string,
  ): Promise<void> {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId ?? message.sessionId;
    if (!targetSessionId) {
      return;
    }

    const result = await this.transport.createBranch(targetSessionId, {
      sourceTimelineId: message.timelineId,
      sourceTurnId: message.turnId,
      reason: "manual_branch",
      metadata: {
        source: this.source,
      },
    });

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      activeTimelineId: result.timeline.id,
    }));
    await this.refreshSessionGraph(targetSessionId, result.timeline.id);
    await this.reloadSessionListInternal();
  }

  async regenerateAssistantMessage(
    message: IAiSessionViewMessage,
    sessionId?: string,
  ): Promise<void> {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId ?? message.sessionId;
    if (!targetSessionId || message.role !== "assistant") {
      return;
    }

    const state = this.getSessionState(targetSessionId);
    if (!state?.graph || state.sending) {
      return;
    }

    const session = state.graph.session;
    const timelineId = message.timelineId;
    let assembly = createAiSessionStreamAssembly();
    let streamedTimelineId = timelineId;
    const streamController = new AbortController();

    const assistantMessage: IAiSessionViewMessage = {
      id: `local-regenerated-assistant-${Date.now()}`,
      messageId: `local-regenerated-assistant-${Date.now()}`,
      sessionId: targetSessionId,
      timelineId,
      turnId: `local-regenerated-turn-${Date.now()}`,
      index: -1,
      role: "assistant",
      content: "",
      pending: true,
      actions: this.defaultActionsForRole("assistant"),
    };

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      sending: true,
      error: "",
      streamStatus: "Waiting for regeneration stream...",
      activeStreamController: streamController,
      messages: [...(current?.messages ?? []), assistantMessage],
    }));

    try {
      await this.transport.regenerateAssistant(
        session.id,
        timelineId,
        {
          sourceTurnId: message.turnId,
          provider: state.provider.trim() || undefined,
          model: state.model.trim() || undefined,
          settings: {
            reasoningEffort: "none",
          },
          metadata: {
            source: this.source,
          },
        },
        (chunk) => {
          assembly = applyAiSessionStreamChunk(assembly, chunk);
          streamedTimelineId = this.readStartedTimelineId(chunk) ?? streamedTimelineId;

          let streamStatus = "Streaming assistant regeneration...";
          if (chunk.type === "completed") {
            streamStatus = "Regeneration finished. Reloading saved history...";
          } else if (chunk.type === "error") {
            streamStatus = "Regeneration returned an error.";
          }

          this.patchSessionState(targetSessionId, (current) => ({
            ...(current ?? this.createSessionState(targetSessionId)),
            activeTimelineId: streamedTimelineId,
            streamStatus,
            messages: (current?.messages ?? []).map((item) =>
              item.id === assistantMessage.id
                ? {
                    ...item,
                    timelineId: streamedTimelineId,
                    content: resolveAiSessionAssistantText(assembly),
                    pending: !assembly.finished,
                  }
                : item,
            ),
          }));
        },
        {
          signal: streamController.signal,
        },
      );

      if (assembly.error) {
        throw new Error(assembly.error);
      }

      await this.refreshSessionGraph(targetSessionId, streamedTimelineId);
      await this.reloadSessionListInternal();
    } finally {
      this.patchSessionState(targetSessionId, (current) => ({
        ...(current ?? this.createSessionState(targetSessionId)),
        sending: false,
        activeStreamController:
          current?.activeStreamController === streamController
            ? null
            : current?.activeStreamController ?? null,
      }));
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private patchSnapshot(patch: Partial<IAiSessionWorkspaceSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
    };
    this.notify();
  }

  private patchSessionState(
    sessionId: string,
    updater: (current: IAiSessionClientState | undefined) => IAiSessionClientState,
  ): void {
    const current = this.snapshot.sessionStatesById[sessionId];
    this.snapshot = {
      ...this.snapshot,
      sessionStatesById: {
        ...this.snapshot.sessionStatesById,
        [sessionId]: updater(current),
      },
    };
    this.notify();
  }

  private async reloadSessionListInternal(): Promise<void> {
    this.patchSnapshot({
      sessions: await this.transport.listSessions(),
    });
  }

  private async ensureSessionRecord(): Promise<IAiSessionResponseDto> {
    const currentSessionId = this.activeSessionStore?.getActiveSessionId() ?? null;
    if (currentSessionId) {
      const session = await this.transport.getSession(currentSessionId);
      if (session) {
        return session;
      }
    }

    const session = await this.transport.createSession({
      type: "chat",
      metadata: {
        source: this.source,
      },
    });
    this.activeSessionStore?.setActiveSessionId(session.id);
    return session;
  }

  private ensureLocalSessionState(
    sessionId: string,
    session: IAiSessionResponseDto,
  ): void {
    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      provider:
        current?.provider ||
        this.readSessionProvider(session) ||
        this.defaultProvider,
      model:
        current?.model || this.readSessionModel(session) || this.defaultModel,
    }));
  }

  private createSessionState(sessionId: string): IAiSessionClientState {
    return {
      sessionId,
      graph: null,
      activeTimelineId: null,
      messages: [],
      prompt: "",
      attachments: [],
      editingDraft: null,
      provider: this.defaultProvider,
      model: this.defaultModel,
      loading: false,
      sending: false,
      streamStatus: "",
      error: "",
      activeStreamController: null,
    };
  }

  private mergeGraphIntoState(
    graph: IAiSessionGraphDto,
    current: IAiSessionClientState,
  ): IAiSessionClientState {
    const activeTimelineId = this.resolveTimelineIdFromGraph(
      graph,
      current.activeTimelineId,
    );
    return {
      ...current,
      graph,
      activeTimelineId,
      messages: this.toViewMessages(graph, activeTimelineId),
      provider:
        current.provider ||
        this.readSessionProvider(graph.session) ||
        this.defaultProvider,
      model:
        current.model ||
        this.readSessionModel(graph.session) ||
        this.defaultModel,
      loading: false,
    };
  }

  private resolveTimelineIdFromGraph(
    graph: IAiSessionGraphDto | null,
    preferredTimelineId?: string | null,
  ): string | null {
    if (!graph) {
      return null;
    }

    if (
      preferredTimelineId &&
      graph.timelines.some((timeline) => timeline.id === preferredTimelineId)
    ) {
      return preferredTimelineId;
    }

    return (
      graph.session.defaultTimelineId ||
      graph.timelines.find((timeline) => timeline.isDefault)?.id ||
      graph.timelines[0]?.id ||
      null
    );
  }

  private toViewMessages(
    graph: IAiSessionGraphDto,
    timelineId: string | null,
  ): IAiSessionViewMessage[] {
    if (!timelineId) {
      return [];
    }

    const timelineTurns = graph.timelineTurns
      .filter((timelineTurn) => timelineTurn.timelineId === timelineId)
      .sort((left, right) => left.index - right.index);
    const messagesByTurnId = new Map<string, typeof graph.messages>();

    for (const message of graph.messages) {
      const current = messagesByTurnId.get(message.turnId) ?? [];
      current.push(message);
      messagesByTurnId.set(message.turnId, current);
    }

    return timelineTurns.flatMap((timelineTurn) =>
      (messagesByTurnId.get(timelineTurn.turnId) ?? [])
        .slice()
        .sort((left, right) => left.index - right.index)
        .map((message) => ({
          id: message.id,
          messageId: message.id,
          sessionId: graph.session.id,
          timelineId,
          turnId: message.turnId,
          index: message.index,
          role: message.role,
          content: message.content,
          name: message.name,
          feedback: this.findFeedbackRating(graph, message.id),
          actions: this.defaultActionsForRole(message.role),
          metadata: message.metadata,
        })),
    );
  }

  private findFeedbackRating(
    graph: IAiSessionGraphDto,
    messageId: string,
  ): IAiSessionMessageFeedbackValue | null {
    const feedback = graph.feedback.find((item) => item.messageId === messageId);
    if (!feedback) {
      return null;
    }

    return feedback.rating;
  }

  private defaultActionsForRole(
    role: IAiSessionViewMessage["role"],
  ): IAiSessionViewMessageActions {
    if (role === "assistant") {
      return {
        copy: true,
        feedback: true,
        regenerate: true,
        branch: true,
      };
    }

    if (role === "user") {
      return {
        copy: true,
        edit: true,
      };
    }

    return {
      copy: true,
    };
  }

  private readStartedTimelineId(chunk: IAiSessionStreamEvent): string | null {
    const timelineId = chunk.timeline?.id;
    return typeof timelineId === "string" ? timelineId : null;
  }

  private readContentText(content: IAiSessionEditingDraft["originalContent"]): string {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part) {
            return typeof part.text === "string" ? part.text : "";
          }
          return "";
        })
        .filter(Boolean)
        .join("");
    }

    return "";
  }

  private syncSessionListEntry(session: IAiSessionResponseDto): void {
    const existingIndex = this.snapshot.sessions.findIndex(
      (item) => item.id === session.id,
    );
    const sessions =
      existingIndex === -1
        ? [session, ...this.snapshot.sessions]
        : this.snapshot.sessions.map((item) =>
            item.id === session.id ? { ...item, ...session } : item,
          );

    this.patchSnapshot({
      sessions,
    });
  }

  private async refreshSessionGraphUntil(
    sessionId: string,
    timelineId: string,
    minimumMessageCount: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < this.abortRefreshAttempts; attempt += 1) {
      await this.refreshSessionGraph(sessionId, timelineId);
      if ((this.getSessionState(sessionId)?.messages.length ?? 0) >= minimumMessageCount) {
        return;
      }

      await new Promise((resolve) =>
        globalThis.setTimeout(resolve, this.abortRefreshDelayMs),
      );
    }
  }

  private buildSessionSettings(
    state?: IAiSessionClientState | null,
  ): Record<string, unknown> {
    const current = this.readSessionSettings(state?.graph?.session ?? null);
    const provider = state?.provider.trim() ?? "";
    const model = state?.model.trim() ?? "";

    return {
      ...current,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    };
  }

  private readSessionSettings(session: IAiSessionResponseDto | null): {
    provider?: string;
    model?: string;
    systemPrompt?: string;
  } {
    const settings = session?.settings;
    if (!settings || typeof settings !== "object") {
      return {};
    }

    return {
      provider:
        typeof settings["provider"] === "string"
          ? settings["provider"]
          : undefined,
      model:
        typeof settings["model"] === "string" ? settings["model"] : undefined,
      systemPrompt:
        typeof settings["systemPrompt"] === "string"
          ? settings["systemPrompt"]
          : undefined,
    };
  }

  private readSessionProvider(session: IAiSessionResponseDto): string {
    return this.readSessionSettings(session).provider || "";
  }

  private readSessionModel(session: IAiSessionResponseDto): string {
    return this.readSessionSettings(session).model || "";
  }

  private areSessionSettingsEqual(
    session: IAiSessionResponseDto,
    nextSettings: Record<string, unknown>,
  ): boolean {
    const current = this.readSessionSettings(session);
    return (
      current.provider === nextSettings["provider"] &&
      current.model === nextSettings["model"] &&
      current.systemPrompt === nextSettings["systemPrompt"]
    );
  }

  private buildUserMessageContent(
    prompt: string,
    attachments: IAiSessionAttachment[],
  ) {
    if (attachments.length === 0) {
      return prompt;
    }

    const parts: AiContentPart[] = [];
    if (prompt) {
      parts.push({ type: "text", text: prompt });
    }

    for (const attachment of attachments) {
      parts.push(attachment.part);
    }

    return parts;
  }

  private readHeartbeatToolName(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== "object") {
      return null;
    }

    const toolName = (metadata as Record<string, unknown>)["toolName"];
    return typeof toolName === "string" ? toolName : null;
  }

  private isAbortError(error: unknown): boolean {
    return (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    );
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "AI session request failed.";
  }
}
