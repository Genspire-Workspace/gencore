import type { AiContentPart } from "@genspire/ai/domain/messages";
import type {
  IAiSessionActiveSessionStore,
  IAiSessionAttachment,
  IAiSessionClientState,
  IAiSessionEditingDraft,
  IAiSessionGraphDto,
  IAiSessionMessageFeedbackValue,
  IAiSessionOptimisticStreamState,
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
  resolveAiSessionAssistantContent,
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

  async updateSession(
    sessionId: string,
    input: {
      title?: string;
      settings?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
      type?: "chat";
    },
  ): Promise<IAiSessionResponseDto> {
    const session = await this.transport.updateSession(sessionId, input);

    this.syncSessionListEntry(session);
    this.patchSessionState(sessionId, (current) => {
      const next = current ?? this.createSessionState(sessionId);
      const persistedGraph = next.persistedGraph
        ? {
            ...next.persistedGraph,
            session,
          }
        : next.persistedGraph;
      const optimisticGraph = next.optimisticGraph
        ? {
            ...next.optimisticGraph,
            session,
          }
        : next.optimisticGraph;

      return {
        ...this.applyGraphState(next, {
          persistedGraph,
          optimisticGraph,
        }),
        provider: this.readSessionProvider(session) || next.provider,
        model: this.readSessionModel(session) || next.model,
      };
    });

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.transport.deleteSession(sessionId);

    const nextSessions = this.snapshot.sessions.filter((session) => session.id !== sessionId);
    const nextSelectedSessionId =
      this.snapshot.selectedSessionId === sessionId
        ? (nextSessions[0]?.id ?? null)
        : this.snapshot.selectedSessionId;

    const {
      [sessionId]: _deletedState,
      ...remainingStates
    } = this.snapshot.sessionStatesById;

    this.snapshot = {
      ...this.snapshot,
      sessions: nextSessions,
      selectedSessionId: nextSelectedSessionId,
      sessionStatesById: remainingStates,
    };
    this.activeSessionStore?.setActiveSessionId(nextSelectedSessionId);
    this.notify();

    if (nextSelectedSessionId && !this.getSessionState(nextSelectedSessionId)?.graph) {
      await this.openSession(nextSelectedSessionId);
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

    const editingDraft = state.editingDraft;
    const promptSource = editingDraft ? editingDraft.prompt : state.prompt;
    const attachmentSource = editingDraft ? editingDraft.attachments : state.attachments;
    const prompt = promptSource.trim();
    const attachments = attachmentSource;
    if ((prompt.length === 0 && attachments.length === 0) || state.sending) {
      return;
    }

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
    const sessionSettings = this.readSessionSettings(session);
    const optimistic = editingDraft
      ? this.buildOptimisticBranchState(state, {
          sessionId: session.id,
          sourceTimelineId: timelineId,
          sourceTurnId: editingDraft.turnId,
          branchName: "Edited user regeneration",
          branchReason: "user_edit_regeneration",
          turnSource: "edited_user",
          userContent: content,
        })
      : this.buildOptimisticMessageState(state, {
          sessionId: session.id,
          timelineId,
          userContent: content,
        });

    let assembly = createAiSessionStreamAssembly();
    const streamController = new AbortController();
    this.patchSessionState(targetId, (current) => ({
      ...this.applyGraphState(
        current ?? this.createSessionState(targetId),
        {
          optimisticGraph: optimistic.graph,
          activeTimelineId: optimistic.activeTimelineId,
        },
      ),
      sending: true,
      error: "",
      streamStatus: editingDraft
        ? "Waiting for regeneration stream..."
        : "Waiting for stream...",
      prompt: editingDraft ? current?.prompt ?? state.prompt : "",
      attachments: editingDraft ? current?.attachments ?? state.attachments : [],
      editingDraft: null,
      activeStreamController: streamController,
      optimisticStream: optimistic.stream,
    }));
    const expectedMessageCount = optimistic.visibleMessageCount;
    let streamedTimelineId = timelineId;

    try {
      const streamInput = {
        provider: state.provider.trim() || undefined,
        model: state.model.trim() || undefined,
        systemPrompt: sessionSettings.systemPrompt,
        settings: {
          temperature: sessionSettings.temperature,
          topP: sessionSettings.topP,
          maxTokens: sessionSettings.maxTokens,
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
          streamStatus = "Latest assistant turn saved.";
        } else if (chunk.type === "error") {
          streamStatus = "Stream returned an error.";
        }

        this.patchSessionState(targetId, (current) => {
          const next = current ?? this.createSessionState(targetId);
          const updatedGraphs = this.applyStreamChunkToOptimisticState(
            next,
            chunk,
            assembly,
          );
          const promotedOnComplete = chunk.type === "completed"
            ? this.applyGraphState(updatedGraphs, {
                persistedGraph: updatedGraphs.optimisticGraph,
                optimisticGraph: null,
                activeTimelineId: streamedTimelineId,
              })
            : updatedGraphs;

          return {
            ...promotedOnComplete,
            optimisticStream:
              chunk.type === "completed"
                ? null
                : promotedOnComplete.optimisticStream,
            activeTimelineId: streamedTimelineId,
            streamStatus,
          };
        });
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

      await this.reloadSessionListInternal();
    } catch (error) {
      const stopped = this.isAbortError(error);
      this.patchSessionState(targetId, (current) =>
        this.handleOptimisticStreamFailure(
          current ?? this.createSessionState(targetId),
          {
            assembly,
            stopped,
            error: stopped ? null : this.readErrorMessage(error),
            fallbackText:
              resolveAiSessionAssistantText(assembly) ||
              (stopped
                ? "Generation stopped."
                : "Assistant stream failed."),
          },
        ),
      );

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

  setActiveTimeline(timelineId: string | null, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => {
      const next = current ?? this.createSessionState(targetSessionId);
      const graph = next.graph;
      if (
        timelineId &&
        graph &&
        !graph.timelines.some((timeline) => timeline.id === timelineId)
      ) {
        return next;
      }

      return this.applyGraphState(next, {
        activeTimelineId: timelineId,
      });
    });
  }

  beginEditMessage(message: IAiSessionViewMessage, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId || message.role !== "user") {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      editingDraft: {
        messageId: message.messageId,
        turnId: message.turnId,
        sessionId: message.sessionId,
        timelineId: message.timelineId,
        originalContent: message.content,
        prompt: this.readContentText(message.content),
        attachments: [],
      },
    }));
  }

  setEditingPrompt(value: string, sessionId?: string): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => {
      const next = current ?? this.createSessionState(targetSessionId);
      if (!next.editingDraft) {
        return next;
      }

      return {
        ...next,
        editingDraft: {
          ...next.editingDraft,
          prompt: value,
        },
      };
    });
  }

  setEditingAttachments(
    value: IAiSessionAttachment[],
    sessionId?: string,
  ): void {
    const targetSessionId = sessionId ?? this.snapshot.selectedSessionId;
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => {
      const next = current ?? this.createSessionState(targetSessionId);
      if (!next.editingDraft) {
        return next;
      }

      return {
        ...next,
        editingDraft: {
          ...next.editingDraft,
          attachments: value,
        },
      };
    });
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

    const result = await this.transport.createSessionBranch(targetSessionId, {
      sourceTimelineId: message.timelineId,
      sourceTurnId: message.turnId,
      metadata: {
        source: this.source,
      },
    });

    this.syncSessionListEntry(result.session);
    this.selectSession(result.session.id);
    this.patchSessionState(result.session.id, (current) =>
      this.mergeGraphIntoState(
        result.graph,
        current ?? this.createSessionState(result.session.id),
      ),
    );
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
    const sessionSettings = this.readSessionSettings(session);
    const timelineId = message.timelineId;
    let assembly = createAiSessionStreamAssembly();
    let streamedTimelineId = timelineId;
    const streamController = new AbortController();
    const sourceUserMessage = this.findUserMessageForTurn(state.graph, message.turnId);
    if (!sourceUserMessage) {
      return;
    }
    const optimistic = this.buildOptimisticBranchState(state, {
      sessionId: targetSessionId,
      sourceTimelineId: timelineId,
      sourceTurnId: message.turnId,
      branchName: "Assistant regeneration",
      branchReason: "assistant_regeneration",
      turnSource: "regenerated",
      userContent: sourceUserMessage.content,
    });

    this.patchSessionState(targetSessionId, (current) => ({
      ...this.applyGraphState(
        current ?? this.createSessionState(targetSessionId),
        {
          optimisticGraph: optimistic.graph,
          activeTimelineId: optimistic.activeTimelineId,
        },
      ),
      sending: true,
      error: "",
      streamStatus: "Waiting for regeneration stream...",
      activeStreamController: streamController,
      optimisticStream: optimistic.stream,
    }));

    try {
      await this.transport.regenerateAssistant(
        session.id,
        timelineId,
        {
          sourceTurnId: message.turnId,
          provider: state.provider.trim() || undefined,
          model: state.model.trim() || undefined,
          systemPrompt: sessionSettings.systemPrompt,
          settings: {
            temperature: sessionSettings.temperature,
            topP: sessionSettings.topP,
            maxTokens: sessionSettings.maxTokens,
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
            streamStatus = "Latest assistant turn saved.";
          } else if (chunk.type === "error") {
            streamStatus = "Regeneration returned an error.";
          }

          this.patchSessionState(targetSessionId, (current) => {
            const next = current ?? this.createSessionState(targetSessionId);
            const updatedGraphs = this.applyStreamChunkToOptimisticState(
              next,
              chunk,
              assembly,
            );
            const promotedOnComplete = chunk.type === "completed"
              ? this.applyGraphState(updatedGraphs, {
                  persistedGraph: updatedGraphs.optimisticGraph,
                  optimisticGraph: null,
                  activeTimelineId: streamedTimelineId,
                })
              : updatedGraphs;

            return {
              ...promotedOnComplete,
              optimisticStream:
                chunk.type === "completed"
                  ? null
                  : promotedOnComplete.optimisticStream,
              activeTimelineId: streamedTimelineId,
              streamStatus,
            };
          });
        },
        {
          signal: streamController.signal,
        },
      );

      if (assembly.error) {
        throw new Error(assembly.error);
      }

      await this.reloadSessionListInternal();
    } catch (error) {
      const stopped = this.isAbortError(error);
      this.patchSessionState(targetSessionId, (current) =>
        this.handleOptimisticStreamFailure(
          current ?? this.createSessionState(targetSessionId),
          {
            assembly,
            stopped,
            error: stopped ? null : this.readErrorMessage(error),
            fallbackText:
              resolveAiSessionAssistantText(assembly) ||
              (stopped
                ? "Generation stopped."
                : "Assistant stream failed."),
          },
        ),
      );

      if (stopped) {
        await this.refreshSessionGraphUntil(
          targetSessionId,
          streamedTimelineId,
          optimistic.visibleMessageCount,
        );
        await this.reloadSessionListInternal();
      } else {
        throw error;
      }
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
      persistedGraph: null,
      optimisticGraph: null,
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
      optimisticStream: null,
    };
  }

  private mergeGraphIntoState(
    graph: IAiSessionGraphDto,
    current: IAiSessionClientState,
  ): IAiSessionClientState {
    const next = this.applyGraphState(current, {
      persistedGraph: graph,
      optimisticGraph: null,
      activeTimelineId: current.activeTimelineId,
    });
    return {
      ...next,
      optimisticStream: null,
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
          pending: this.isPendingMessage(message),
          feedback: this.findFeedbackRating(graph, message.id),
          actions: this.defaultActionsForRole(message.role),
          metadata: message.metadata,
        })),
    );
  }

  private isPendingMessage(
    message: IAiSessionGraphDto["messages"][number],
  ): boolean {
    return Boolean(
      message.metadata &&
      typeof message.metadata === "object" &&
      message.metadata["__sdkPending"] === true,
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

  private applyGraphState(
    current: IAiSessionClientState,
    input: {
      persistedGraph?: IAiSessionGraphDto | null;
      optimisticGraph?: IAiSessionGraphDto | null;
      activeTimelineId?: string | null;
    },
  ): IAiSessionClientState {
    const persistedGraph =
      input.persistedGraph !== undefined ? input.persistedGraph : current.persistedGraph;
    const optimisticGraph =
      input.optimisticGraph !== undefined ? input.optimisticGraph : current.optimisticGraph;
    const graph = optimisticGraph ?? persistedGraph ?? null;
    const activeTimelineId = this.resolveTimelineIdFromGraph(
      graph,
      input.activeTimelineId !== undefined
        ? input.activeTimelineId
        : current.activeTimelineId,
    );

    return {
      ...current,
      graph,
      persistedGraph,
      optimisticGraph,
      activeTimelineId,
      messages: graph ? this.toViewMessages(graph, activeTimelineId) : [],
    };
  }

  private buildOptimisticMessageState(
    state: IAiSessionClientState,
    input: {
      sessionId: string;
      timelineId: string;
      userContent: IAiSessionViewMessage["content"];
    },
  ): {
    graph: IAiSessionGraphDto;
    stream: IAiSessionOptimisticStreamState;
    activeTimelineId: string;
    visibleMessageCount: number;
  } {
    if (!state.graph) {
      throw new Error("Session graph is unavailable.");
    }

    const graph = this.cloneGraph(state.graph);
    const now = new Date().toISOString();
    const turnId = this.createOptimisticId("turn");
    const timelineTurnId = this.createOptimisticId("timeline-turn");
    const userMessageId = this.createOptimisticId("user-message");
    const assistantMessageId = this.createOptimisticId("assistant-message");
    const nextTurnIndex = this.nextTimelineTurnIndex(graph, input.timelineId);

    graph.turns.push({
      id: turnId,
      sessionId: input.sessionId,
      status: "running",
      provider: state.provider || undefined,
      model: state.model || undefined,
      startedAt: now,
      metadata: {
        source: this.source,
      },
      createdAt: now,
      updatedAt: now,
    });
    graph.timelineTurns.push({
      id: timelineTurnId,
      sessionId: input.sessionId,
      timelineId: input.timelineId,
      turnId,
      index: nextTurnIndex,
      source: "original",
      createdAt: now,
      updatedAt: now,
    });
    graph.messages.push(
      this.createOptimisticGraphMessage({
        id: userMessageId,
        sessionId: input.sessionId,
        turnId,
        index: 0,
        role: "user",
        content: input.userContent,
      }),
      this.createOptimisticGraphMessage({
        id: assistantMessageId,
        sessionId: input.sessionId,
        turnId,
        index: 1,
        role: "assistant",
        content: "",
        metadata: this.createPendingMetadata(),
      }),
    );

    return {
      graph,
      stream: {
        kind: "message",
        started: false,
        rollbackGraph: state.graph,
        rollbackActiveTimelineId: state.activeTimelineId,
        optimisticTimelineId: input.timelineId,
        optimisticTurnId: turnId,
        optimisticTimelineTurnId: timelineTurnId,
        optimisticUserMessageId: userMessageId,
        optimisticAssistantMessageId: assistantMessageId,
      },
      activeTimelineId: input.timelineId,
      visibleMessageCount: this.toViewMessages(graph, input.timelineId).length,
    };
  }

  private buildOptimisticBranchState(
    state: IAiSessionClientState,
    input: {
      sessionId: string;
      sourceTimelineId: string;
      sourceTurnId: string;
      branchName: string;
      branchReason: string;
      turnSource: "regenerated" | "edited_user";
      userContent: IAiSessionViewMessage["content"];
    },
  ): {
    graph: IAiSessionGraphDto;
    stream: IAiSessionOptimisticStreamState;
    activeTimelineId: string;
    visibleMessageCount: number;
  } {
    if (!state.graph) {
      throw new Error("Session graph is unavailable.");
    }

    const graph = this.cloneGraph(state.graph);
    const now = new Date().toISOString();
    const sourceTimelineTurn = graph.timelineTurns.find(
      (timelineTurn) =>
        timelineTurn.timelineId === input.sourceTimelineId &&
        timelineTurn.turnId === input.sourceTurnId,
    );
    if (!sourceTimelineTurn) {
      throw new Error("Source turn is not attached to the requested timeline.");
    }

    const optimisticTimelineId = this.createOptimisticId("timeline");
    const optimisticBranchId = this.createOptimisticId("branch");
    const optimisticTurnId = this.createOptimisticId("turn");
    const optimisticTimelineTurnId = this.createOptimisticId("timeline-turn");
    const optimisticUserMessageId = this.createOptimisticId("user-message");
    const optimisticAssistantMessageId = this.createOptimisticId("assistant-message");

    graph.timelines.push({
      id: optimisticTimelineId,
      sessionId: input.sessionId,
      name: input.branchName,
      isDefault: false,
      metadata: {
        source: this.source,
        __sdkOptimistic: true,
      },
      createdAt: now,
      updatedAt: now,
    });
    graph.branches.push({
      id: optimisticBranchId,
      sessionId: input.sessionId,
      sourceTimelineId: input.sourceTimelineId,
      sourceTurnId: input.sourceTurnId,
      sourceTurnIndex: sourceTimelineTurn.index,
      targetTimelineId: optimisticTimelineId,
      reason: input.branchReason,
      metadata: {
        source: this.source,
        __sdkOptimistic: true,
      },
      createdAt: now,
      updatedAt: now,
    });

    for (const timelineTurn of graph.timelineTurns
      .filter(
        (item) =>
          item.timelineId === input.sourceTimelineId &&
          item.index < sourceTimelineTurn.index,
      )
      .sort((left, right) => left.index - right.index)) {
      graph.timelineTurns.push({
        id: this.createOptimisticId("timeline-turn-copy"),
        sessionId: input.sessionId,
        timelineId: optimisticTimelineId,
        turnId: timelineTurn.turnId,
        index: timelineTurn.index,
        source: "branch_copy",
        createdAt: now,
        updatedAt: now,
      });
    }

    graph.turns.push({
      id: optimisticTurnId,
      sessionId: input.sessionId,
      status: "running",
      provider: state.provider || undefined,
      model: state.model || undefined,
      startedAt: now,
      metadata: {
        source: this.source,
      },
      createdAt: now,
      updatedAt: now,
    });
    graph.timelineTurns.push({
      id: optimisticTimelineTurnId,
      sessionId: input.sessionId,
      timelineId: optimisticTimelineId,
      turnId: optimisticTurnId,
      index: sourceTimelineTurn.index,
      source: input.turnSource,
      createdAt: now,
      updatedAt: now,
    });
    graph.messages.push(
      this.createOptimisticGraphMessage({
        id: optimisticUserMessageId,
        sessionId: input.sessionId,
        turnId: optimisticTurnId,
        index: 0,
        role: "user",
        content: input.userContent,
      }),
      this.createOptimisticGraphMessage({
        id: optimisticAssistantMessageId,
        sessionId: input.sessionId,
        turnId: optimisticTurnId,
        index: 1,
        role: "assistant",
        content: "",
        metadata: this.createPendingMetadata(),
      }),
    );

    return {
      graph,
      stream: {
        kind: input.turnSource === "edited_user" ? "edit" : "regenerate",
        started: false,
        rollbackGraph: state.graph,
        rollbackActiveTimelineId: state.activeTimelineId,
        optimisticTimelineId,
        optimisticTurnId,
        optimisticTimelineTurnId,
        optimisticUserMessageId,
        optimisticAssistantMessageId,
        optimisticBranchId,
      },
      activeTimelineId: optimisticTimelineId,
      visibleMessageCount: this.toViewMessages(graph, optimisticTimelineId).length,
    };
  }

  private applyStreamChunkToOptimisticState(
    state: IAiSessionClientState,
    chunk: IAiSessionStreamEvent,
    assembly: ReturnType<typeof createAiSessionStreamAssembly>,
  ): IAiSessionClientState {
    if (!state.optimisticGraph || !state.optimisticStream) {
      return state;
    }

    let optimisticGraph = state.optimisticGraph;
    let optimisticStream = state.optimisticStream;

    if (chunk.type === "started") {
      optimisticGraph = this.applyStartedChunkToOptimisticGraph(
        optimisticGraph,
        optimisticStream,
        chunk,
      );
      optimisticStream = {
        ...optimisticStream,
        started: true,
        optimisticTimelineId:
          this.readStartedTimelineId(chunk) ?? optimisticStream.optimisticTimelineId,
        optimisticTurnId: chunk.turnId ?? optimisticStream.optimisticTurnId,
        optimisticTimelineTurnId:
          chunk.timelineTurnId ?? optimisticStream.optimisticTimelineTurnId,
        optimisticUserMessageId:
          chunk.messageId ?? optimisticStream.optimisticUserMessageId,
        optimisticBranchId:
          chunk.branch?.id ?? optimisticStream.optimisticBranchId,
      };
    }

    if (
      chunk.type === "delta" ||
      chunk.type === "reasoning_delta" ||
      chunk.type === "tool_call" ||
      chunk.type === "tool_result" ||
      chunk.type === "message" ||
      chunk.type === "completed" ||
      chunk.type === "error"
    ) {
      optimisticGraph = this.updateOptimisticAssistantMessage(
        optimisticGraph,
        optimisticStream,
        {
          id:
            chunk.type === "message"
              ? chunk.messageId ?? chunk.message?.id ?? optimisticStream.optimisticAssistantMessageId
              : optimisticStream.optimisticAssistantMessageId,
          timelineId:
            this.readStartedTimelineId(chunk) ?? chunk.timelineId ?? optimisticStream.optimisticTimelineId,
          turnId: chunk.turnId ?? optimisticStream.optimisticTurnId,
          content:
            chunk.type === "error"
              ? resolveAiSessionAssistantText(assembly)
              : resolveAiSessionAssistantContent(assembly),
          pending: !(chunk.type === "message" || chunk.type === "completed" || chunk.type === "error"),
          metadata:
            chunk.type === "message"
              ? chunk.message?.metadata
              : chunk.type === "completed" || chunk.type === "error"
                ? undefined
                : this.createPendingMetadata(),
          provider:
            chunk.type === "message"
              ? chunk.message?.provider
              : chunk.provider,
          model:
            chunk.type === "message"
              ? chunk.message?.model
              : chunk.model,
          name: chunk.type === "message" ? chunk.message?.name : undefined,
          usage: chunk.type === "message" ? chunk.message?.usage : undefined,
          toolCalls: chunk.type === "message" ? chunk.message?.toolCalls : undefined,
          toolResults: chunk.type === "message" ? chunk.message?.toolResults : undefined,
        },
      );
    }

    if (
      chunk.type === "message" &&
      (chunk.messageId || chunk.message?.id)
    ) {
      optimisticStream = {
        ...optimisticStream,
        optimisticAssistantMessageId:
          chunk.messageId ??
          chunk.message?.id ??
          optimisticStream.optimisticAssistantMessageId,
      };
    }

    if (chunk.type === "completed") {
      optimisticGraph = this.updateOptimisticTurn(
        optimisticGraph,
        optimisticStream,
        {
          id: optimisticStream.optimisticTurnId,
          status: "completed",
          finishedAt: new Date().toISOString(),
          finishReason: chunk.finishReason,
          error: undefined,
        },
      );
    }

    if (chunk.type === "error") {
      optimisticGraph = this.updateOptimisticTurn(
        optimisticGraph,
        optimisticStream,
        {
          id: optimisticStream.optimisticTurnId,
          status: "failed",
          finishedAt: new Date().toISOString(),
          error: chunk.error,
        },
      );
    }

    return {
      ...this.applyGraphState(state, {
        optimisticGraph,
        activeTimelineId:
          this.readStartedTimelineId(chunk) ??
          chunk.timelineId ??
          optimisticStream.optimisticTimelineId,
      }),
      optimisticStream,
    };
  }

  private handleOptimisticStreamFailure(
    state: IAiSessionClientState,
    input: {
      assembly: ReturnType<typeof createAiSessionStreamAssembly>;
      stopped: boolean;
      error: string | null;
      fallbackText: string;
    },
  ): IAiSessionClientState {
    const optimisticStream = state.optimisticStream;
    const optimisticGraph = state.optimisticGraph;

    if (!optimisticStream || !optimisticGraph) {
      return {
        ...state,
        error: input.error ?? "",
        streamStatus: input.stopped ? "Stream stopped." : "",
      };
    }

    if (!optimisticStream.started) {
      return {
        ...this.applyGraphState(state, {
          optimisticGraph: null,
          activeTimelineId: optimisticStream.rollbackActiveTimelineId,
        }),
        error: input.error ?? "",
        streamStatus: input.stopped ? "Stream stopped." : "",
        optimisticStream: null,
      };
    }

    const failedGraph = this.updateOptimisticAssistantMessage(
      optimisticGraph,
      optimisticStream,
      {
        content: input.fallbackText,
        pending: false,
      },
    );
    const finalizedGraph = this.updateOptimisticTurn(
      failedGraph,
      optimisticStream,
      {
        id: optimisticStream.optimisticTurnId,
        status: input.stopped ? "aborted" : "failed",
        finishedAt: new Date().toISOString(),
        finishReason: input.stopped ? "aborted" : undefined,
        error: input.stopped ? undefined : input.error ?? undefined,
      },
    );

    return {
      ...this.applyGraphState(state, {
        optimisticGraph: finalizedGraph,
        activeTimelineId: optimisticStream.optimisticTimelineId,
      }),
      error: input.error ?? "",
      streamStatus: input.stopped ? "Stream stopped." : "",
    };
  }

  private applyStartedChunkToOptimisticGraph(
    graph: IAiSessionGraphDto,
    optimisticStream: IAiSessionOptimisticStreamState,
    chunk: IAiSessionStreamEvent,
  ): IAiSessionGraphDto {
    const replacements = new Map<string, string>();
    const startedTimelineId = this.readStartedTimelineId(chunk);

    if (
      optimisticStream.kind !== "message" &&
      startedTimelineId &&
      startedTimelineId !== optimisticStream.optimisticTimelineId
    ) {
      replacements.set(optimisticStream.optimisticTimelineId, startedTimelineId);
    }
    if (chunk.turnId && chunk.turnId !== optimisticStream.optimisticTurnId) {
      replacements.set(optimisticStream.optimisticTurnId, chunk.turnId);
    }
    if (
      chunk.timelineTurnId &&
      chunk.timelineTurnId !== optimisticStream.optimisticTimelineTurnId
    ) {
      replacements.set(optimisticStream.optimisticTimelineTurnId, chunk.timelineTurnId);
    }
    if (chunk.messageId && chunk.messageId !== optimisticStream.optimisticUserMessageId) {
      replacements.set(optimisticStream.optimisticUserMessageId, chunk.messageId);
    }
    if (
      optimisticStream.optimisticBranchId &&
      chunk.branch?.id &&
      chunk.branch.id !== optimisticStream.optimisticBranchId
    ) {
      replacements.set(optimisticStream.optimisticBranchId, chunk.branch.id);
    }

    if (replacements.size === 0) {
      return graph;
    }

    return {
      ...graph,
      session: {
        ...graph.session,
        defaultTimelineId:
          graph.session.defaultTimelineId &&
          replacements.get(graph.session.defaultTimelineId)
            ? replacements.get(graph.session.defaultTimelineId)
            : graph.session.defaultTimelineId,
      },
      timelines: graph.timelines.map((timeline) => ({
        ...timeline,
        id: replacements.get(timeline.id) ?? timeline.id,
        sessionId: chunk.sessionId ?? timeline.sessionId,
      })),
      timelineTurns: graph.timelineTurns.map((timelineTurn) => ({
        ...timelineTurn,
        id: replacements.get(timelineTurn.id) ?? timelineTurn.id,
        timelineId: replacements.get(timelineTurn.timelineId) ?? timelineTurn.timelineId,
        turnId: replacements.get(timelineTurn.turnId) ?? timelineTurn.turnId,
        sessionId: chunk.sessionId ?? timelineTurn.sessionId,
      })),
      turns: graph.turns.map((turn) => ({
        ...turn,
        id: replacements.get(turn.id) ?? turn.id,
        sessionId: chunk.sessionId ?? turn.sessionId,
      })),
      messages: graph.messages.map((message) => ({
        ...message,
        id: replacements.get(message.id) ?? message.id,
        turnId: replacements.get(message.turnId) ?? message.turnId,
        sessionId: chunk.sessionId ?? message.sessionId,
      })),
      branches: graph.branches.map((branch) => ({
        ...branch,
        id: replacements.get(branch.id) ?? branch.id,
        targetTimelineId:
          replacements.get(branch.targetTimelineId) ?? branch.targetTimelineId,
      })),
      generationRuns: graph.generationRuns.map((run) => ({
        ...run,
        turnId: replacements.get(run.turnId) ?? run.turnId,
        timelineId: replacements.get(run.timelineId) ?? run.timelineId,
        sessionId: chunk.sessionId ?? run.sessionId,
      })),
    };
  }

  private updateOptimisticAssistantMessage(
    graph: IAiSessionGraphDto,
    optimisticStream: IAiSessionOptimisticStreamState,
    input: {
      id?: string;
      timelineId?: string;
      turnId?: string;
      content?: IAiSessionViewMessage["content"];
      pending?: boolean;
      metadata?: Record<string, unknown>;
      provider?: string;
      model?: string;
      name?: string;
      usage?: Record<string, unknown>;
      toolCalls?: unknown[];
      toolResults?: unknown[];
    },
  ): IAiSessionGraphDto {
    return {
      ...graph,
      messages: graph.messages.map((message) =>
        message.id === optimisticStream.optimisticAssistantMessageId
          ? {
              ...message,
              id: input.id ?? message.id,
              turnId: input.turnId ?? message.turnId,
              content: input.content ?? message.content,
              name: input.name ?? message.name,
              provider: input.provider ?? message.provider,
              model: input.model ?? message.model,
              usage: input.usage ?? message.usage,
              toolCalls: input.toolCalls ?? message.toolCalls,
              toolResults: input.toolResults ?? message.toolResults,
              metadata:
                input.metadata !== undefined
                  ? input.metadata
                  : input.pending === true
                    ? this.createPendingMetadata()
                    : undefined,
            }
          : message,
      ),
      timelineTurns: graph.timelineTurns.map((timelineTurn) =>
        timelineTurn.id === optimisticStream.optimisticTimelineTurnId
          ? {
              ...timelineTurn,
              timelineId: input.timelineId ?? timelineTurn.timelineId,
              turnId: input.turnId ?? timelineTurn.turnId,
            }
          : timelineTurn,
      ),
    };
  }

  private updateOptimisticTurn(
    graph: IAiSessionGraphDto,
    optimisticStream: IAiSessionOptimisticStreamState,
    input: {
      id: string;
      status: "running" | "completed" | "failed" | "aborted";
      finishedAt?: string;
      finishReason?: string;
      error?: string;
    },
  ): IAiSessionGraphDto {
    return {
      ...graph,
      turns: graph.turns.map((turn) =>
        turn.id === optimisticStream.optimisticTurnId
          ? {
              ...turn,
              id: input.id,
              status: input.status,
              finishedAt: input.finishedAt ?? turn.finishedAt,
              finishReason: input.finishReason ?? turn.finishReason,
              error: input.error ?? turn.error,
            }
          : turn,
      ),
    };
  }

  private createOptimisticGraphMessage(input: {
    id: string;
    sessionId: string;
    turnId: string;
    index: number;
    role: "system" | "user" | "assistant" | "tool";
    content: IAiSessionViewMessage["content"];
    metadata?: Record<string, unknown>;
  }): IAiSessionGraphDto["messages"][number] {
    const now = new Date().toISOString();
    return {
      id: input.id,
      sessionId: input.sessionId,
      turnId: input.turnId,
      index: input.index,
      role: input.role,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  private createPendingMetadata(): Record<string, unknown> {
    return {
      __sdkPending: true,
      source: this.source,
    };
  }

  private createOptimisticId(prefix: string): string {
    return `sdk-${prefix}-${Date.now()}-${crypto.randomUUID()}`;
  }

  private cloneGraph(graph: IAiSessionGraphDto): IAiSessionGraphDto {
    if (typeof structuredClone === "function") {
      return structuredClone(graph);
    }

    return JSON.parse(JSON.stringify(graph)) as IAiSessionGraphDto;
  }

  private nextTimelineTurnIndex(
    graph: IAiSessionGraphDto,
    timelineId: string,
  ): number {
    const timelineTurns = graph.timelineTurns.filter(
      (timelineTurn) => timelineTurn.timelineId === timelineId,
    );
    if (timelineTurns.length === 0) {
      return 0;
    }

    return Math.max(...timelineTurns.map((timelineTurn) => timelineTurn.index)) + 1;
  }

  private findUserMessageForTurn(
    graph: IAiSessionGraphDto,
    turnId: string,
  ): IAiSessionGraphDto["messages"][number] | null {
    return graph.messages.find(
      (message) => message.turnId === turnId && message.role === "user",
    ) ?? null;
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
    const timelineId = chunk.timeline?.id ?? chunk.timelineId;
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
    temperature?: number;
    topP?: number;
    maxTokens?: number;
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
      temperature:
        typeof settings["temperature"] === "number"
          ? settings["temperature"]
          : undefined,
      topP:
        typeof settings["topP"] === "number" ? settings["topP"] : undefined,
      maxTokens:
        typeof settings["maxTokens"] === "number"
          ? settings["maxTokens"]
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
      current.systemPrompt === nextSettings["systemPrompt"] &&
      current.temperature === nextSettings["temperature"] &&
      current.topP === nextSettings["topP"] &&
      current.maxTokens === nextSettings["maxTokens"]
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
