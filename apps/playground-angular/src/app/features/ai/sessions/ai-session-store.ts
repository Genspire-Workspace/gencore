// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-store.ts

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { appEnv } from '../../../core/app-env';
import { AiSessionService } from './ai-session.service';
import type { AiContentPart, AiMessageContent } from '@genspire/ai/domain/messages';
import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  resolveAiSessionAssistantText,
} from './ai-session-stream';
import type { IChatComposerAttachment, IUiChatMessage } from '../chat/chat-message.types';
import type {
  IAiSessionClientState,
  IAiSessionGraphResponse,
  IAiSessionResponse,
  IAiSessionStreamChunk,
  IAiSessionTimelineDto,
} from './ai-session-types';
import type { IProblemDetails } from '../../../core/problem-details';

@Injectable()
export class AiSessionStore {
  private readonly aiSessionService = inject(AiSessionService);
  private readonly sessionStatesById = signal<Record<string, IAiSessionClientState>>({});
  readonly selectedSessionId = signal<string | null>(null);
  readonly sessions = signal<IAiSessionResponse[]>([]);
  readonly sessionListLoading = signal(false);
  readonly sessionListError = signal('');

  readonly currentSessionState = computed<IAiSessionClientState | null>(() => {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      return null;
    }

    return this.sessionStatesById()[sessionId] ?? null;
  });

  readonly currentSession = computed<IAiSessionResponse | null>(() => {
    const state = this.currentSessionState();
    if (state?.graph?.session) {
      return state.graph.session;
    }

    const sessionId = this.selectedSessionId();
    return sessionId ? this.sessions().find((session) => session.id === sessionId) ?? null : null;
  });

  readonly loading = computed(() => this.sessionListLoading() || this.currentSessionState()?.loading || false);
  readonly sending = computed(() => this.currentSessionState()?.sending || false);
  readonly error = computed(() => this.currentSessionState()?.error || this.sessionListError() || '');
  readonly streamStatus = computed(() => this.currentSessionState()?.streamStatus || '');
  readonly currentMessages = computed(() => this.currentSessionState()?.messages ?? []);
  readonly currentPrompt = computed(() => this.currentSessionState()?.prompt ?? '');
  readonly currentAttachments = computed(() => this.currentSessionState()?.attachments ?? []);
  readonly currentProvider = computed(() => this.currentSessionState()?.provider ?? appEnv.defaultAiProvider);
  readonly currentModel = computed(() => this.currentSessionState()?.model ?? appEnv.defaultAiModel);

  async reloadSession(): Promise<void> {
    this.sessionListLoading.set(true);
    this.sessionListError.set('');

    try {
      await this.reloadSessionListInternal();
      const session = await this.aiSessionService.ensureSession();
      this.selectSession(session.id);
      this.aiSessionService.setActiveSessionId(session.id);
      await this.ensureSessionState(session.id, session);
    } catch (error) {
      this.sessionListError.set(this.readErrorMessage(error));
    } finally {
      this.sessionListLoading.set(false);
    }
  }

  async newSession(): Promise<void> {
    this.sessionListLoading.set(true);
    this.sessionListError.set('');

    try {
      const session = await this.aiSessionService.createSession({
        type: 'chat',
        settings: this.buildSessionSettings(this.currentSessionState()),
        metadata: {
          source: 'playground-angular',
        },
      });
      this.selectSession(session.id);
      this.aiSessionService.setActiveSessionId(session.id);
      this.ensureLocalSessionState(session.id, session);
      await this.refreshSessionGraph(session.id);
      await this.reloadSessionListInternal();
    } catch (error) {
      this.sessionListError.set(this.readErrorMessage(error));
    } finally {
      this.sessionListLoading.set(false);
    }
  }

  async openSession(sessionId: string): Promise<void> {
    this.sessionListError.set('');
    this.selectSession(sessionId);

    try {
      const session = await this.aiSessionService.activateSession(sessionId);
      if (!session) {
        await this.reloadSessionListInternal();
        throw new Error('Session was not found.');
      }

      this.aiSessionService.setActiveSessionId(session.id);
      this.ensureLocalSessionState(session.id, session);
      await this.refreshSessionGraph(session.id);
    } catch (error) {
      this.sessionListError.set(this.readErrorMessage(error));
    }
  }

  async reloadSessionList(): Promise<void> {
    this.sessionListLoading.set(true);
    this.sessionListError.set('');

    try {
      await this.reloadSessionListInternal();
    } catch (error) {
      this.sessionListError.set(this.readErrorMessage(error));
    } finally {
      this.sessionListLoading.set(false);
    }
  }

  selectSession(sessionId: string | null): void {
    this.selectedSessionId.set(sessionId);
  }

  async ensureSessionState(
    sessionId: string,
    session?: IAiSessionResponse,
  ): Promise<IAiSessionClientState> {
    const existing = this.sessionState(sessionId);
    if (existing?.graph) {
      return existing;
    }

    if (session) {
      this.ensureLocalSessionState(sessionId, session);
    }

    await this.refreshSessionGraph(sessionId);
    const next = this.sessionState(sessionId);
    if (!next) {
      throw new Error('Session state could not be initialized.');
    }

    return next;
  }

  async refreshSessionGraph(sessionId?: string, timelineId?: string): Promise<void> {
    const targetSessionId = sessionId ?? this.selectedSessionId();
    if (!targetSessionId) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId)),
      loading: true,
      error: '',
    }));

    try {
      const graph = await this.aiSessionService.getSessionGraph(targetSessionId, timelineId);
      this.syncSessionListEntry(graph.session);
      this.patchSessionState(targetSessionId, (current) => this.mergeGraphIntoState(graph, current ?? this.createSessionState(targetSessionId)));
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
    let targetSessionId = sessionId ?? this.selectedSessionId();
    let session = targetSessionId
      ? this.sessionState(targetSessionId)?.graph?.session ??
        this.sessions().find((item) => item.id === targetSessionId) ??
        null
      : this.currentSession();

    if (!targetSessionId || !session) {
      session = await this.aiSessionService.ensureSession();
      targetSessionId = session.id;
      this.selectSession(targetSessionId);
      this.aiSessionService.setActiveSessionId(targetSessionId);
      await this.ensureSessionState(targetSessionId, session);
    }

    const state = this.sessionState(targetSessionId);
    if (!state) {
      throw new Error('Session state is unavailable.');
    }

    const prompt = state.prompt.trim();
    const attachments = state.attachments;
    if ((prompt.length === 0 && attachments.length === 0) || state.sending) {
      return;
    }

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId!)),
      sending: true,
      error: '',
      streamStatus: 'Waiting for stream...',
    }));

    const timelineId = state.activeTimelineId ?? this.resolveTimelineIdFromGraph(state.graph);
    if (!timelineId) {
      throw new Error('Session does not have an active timeline.');
    }

    const nextSettings = this.buildSessionSettings(state);

    if (!this.areSessionSettingsEqual(session, nextSettings)) {
      session = await this.aiSessionService.updateSession(session.id, {
        settings: nextSettings,
      });
      this.syncSessionListEntry(session);
    }

    const content = this.buildUserMessageContent(prompt, attachments);
    const userMessage: IUiChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content,
    };
    const assistantMessage: IUiChatMessage = {
      id: `local-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      pending: true,
    };

    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId!)),
      messages: [...(current?.messages ?? []), userMessage, assistantMessage],
      prompt: '',
      attachments: [],
    }));

    let assembly = createAiSessionStreamAssembly();
    const streamController = new AbortController();
    this.patchSessionState(targetSessionId, (current) => ({
      ...(current ?? this.createSessionState(targetSessionId!)),
      activeStreamController: streamController,
    }));
    const expectedMessageCount = state.messages.length + 2;

    try {
      await this.aiSessionService.streamMessage(
        session.id,
        timelineId,
        {
          content,
          provider: state.provider.trim() || undefined,
          model: state.model.trim() || undefined,
          settings: {
            reasoningEffort: 'none',
          },
          metadata: {
            source: 'playground-angular',
          },
        },
        (chunk: IAiSessionStreamChunk) => {
          assembly = applyAiSessionStreamChunk(assembly, chunk);

          let streamStatus = 'Streaming assistant reply...';
          if (chunk.type === 'heartbeat') {
            streamStatus = `Streaming... ${this.readHeartbeatToolName(chunk.metadata) || 'waiting for provider'} (${Math.floor((chunk.elapsedMs || 0) / 1000)}s)`;
          } else if (chunk.type === 'completed') {
            streamStatus = 'Stream finished. Reloading saved history...';
          } else if (chunk.type === 'error') {
            streamStatus = 'Stream returned an error.';
          }

          const assistantText = resolveAiSessionAssistantText(assembly);
          this.patchSessionState(targetSessionId!, (current) => ({
            ...(current ?? this.createSessionState(targetSessionId!)),
            streamStatus,
            messages: (current?.messages ?? []).map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    content: assistantText,
                    pending: !assembly.finished,
                  }
                : message,
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

      await this.refreshSessionGraph(targetSessionId, timelineId);
      await this.reloadSessionListInternal();
      this.patchSessionState(targetSessionId, (current) => ({
        ...(current ?? this.createSessionState(targetSessionId)),
        streamStatus: 'Latest assistant turn saved.',
      }));
    } catch (error) {
      const stopped = this.isAbortError(error);
      if (!stopped) {
        this.patchSessionState(targetSessionId, (current) => ({
          ...(current ?? this.createSessionState(targetSessionId)),
          error: this.readErrorMessage(error),
          streamStatus: '',
        }));
      } else {
        this.patchSessionState(targetSessionId, (current) => ({
          ...(current ?? this.createSessionState(targetSessionId)),
          error: '',
          streamStatus: 'Stream stopped.',
        }));
      }

      this.patchSessionState(targetSessionId, (current) => ({
        ...(current ?? this.createSessionState(targetSessionId)),
        messages: (current?.messages ?? []).map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content:
                  resolveAiSessionAssistantText(assembly) ||
                  (stopped ? 'Generation stopped.' : 'Assistant stream failed.'),
                pending: false,
              }
            : message,
        ),
      }));

      if (stopped) {
        await this.refreshSessionGraphUntil(targetSessionId, timelineId, expectedMessageCount);
        await this.reloadSessionListInternal();
      }
    } finally {
      this.patchSessionState(targetSessionId, (current) => ({
        ...(current ?? this.createSessionState(targetSessionId)),
        sending: false,
        activeStreamController:
          current?.activeStreamController === streamController ? null : current?.activeStreamController ?? null,
      }));
    }
  }

  stopStreaming(sessionId?: string): void {
    const targetSessionId = sessionId ?? this.selectedSessionId();
    if (!targetSessionId) {
      return;
    }

    this.sessionState(targetSessionId)?.activeStreamController?.abort();
  }

  readSessionProvider(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).provider || '';
  }

  readSessionModel(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).model || '';
  }

  setCurrentPrompt(value: string): void {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      return;
    }

    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      prompt: value,
    }));
  }

  setCurrentAttachments(value: IChatComposerAttachment[]): void {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      return;
    }

    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      attachments: value,
    }));
  }

  setCurrentProvider(value: string): void {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      return;
    }

    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      provider: value,
    }));
  }

  setCurrentModel(value: string): void {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      return;
    }

    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      model: value,
    }));
  }

  private async reloadSessionListInternal(): Promise<void> {
    this.sessions.set(await this.aiSessionService.listSessions());
  }

  private ensureLocalSessionState(sessionId: string, session: IAiSessionResponse): void {
    this.patchSessionState(sessionId, (current) => ({
      ...(current ?? this.createSessionState(sessionId)),
      provider: current?.provider || this.readSessionProvider(session) || appEnv.defaultAiProvider,
      model: current?.model || this.readSessionModel(session) || appEnv.defaultAiModel,
    }));
  }

  private buildSessionSettings(state?: IAiSessionClientState | null): Record<string, unknown> {
    const current = this.readSessionSettings(state?.graph?.session ?? null);
    const provider = state?.provider.trim() ?? '';
    const model = state?.model.trim() ?? '';

    return {
      ...current,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    };
  }

  private readSessionSettings(session: IAiSessionResponse | null): {
    provider?: string;
    model?: string;
    systemPrompt?: string;
  } {
    const settings = session?.settings;
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return {
      provider: typeof settings['provider'] === 'string' ? settings['provider'] : undefined,
      model: typeof settings['model'] === 'string' ? settings['model'] : undefined,
      systemPrompt:
        typeof settings['systemPrompt'] === 'string' ? settings['systemPrompt'] : undefined,
    };
  }

  private areSessionSettingsEqual(
    session: IAiSessionResponse,
    nextSettings: Record<string, unknown>,
  ): boolean {
    const current = this.readSessionSettings(session);
    return (
      current.provider === nextSettings['provider'] &&
      current.model === nextSettings['model'] &&
      current.systemPrompt === nextSettings['systemPrompt']
    );
  }

  private readHeartbeatToolName(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const toolName = (metadata as Record<string, unknown>)['toolName'];
    return typeof toolName === 'string' ? toolName : null;
  }

  private sessionState(sessionId: string): IAiSessionClientState | null {
    return this.sessionStatesById()[sessionId] ?? null;
  }

  private patchSessionState(
    sessionId: string,
    updater: (current: IAiSessionClientState | undefined) => IAiSessionClientState,
  ): void {
    this.sessionStatesById.update((states) => ({
      ...states,
      [sessionId]: updater(states[sessionId]),
    }));
  }

  private createSessionState(sessionId: string): IAiSessionClientState {
    return {
      sessionId,
      graph: null,
      activeTimelineId: null,
      messages: [],
      prompt: '',
      attachments: [],
      provider: appEnv.defaultAiProvider,
      model: appEnv.defaultAiModel,
      loading: false,
      sending: false,
      streamStatus: '',
      error: '',
      activeStreamController: null,
    };
  }

  private mergeGraphIntoState(
    graph: IAiSessionGraphResponse,
    current: IAiSessionClientState,
  ): IAiSessionClientState {
    const activeTimelineId = this.resolveTimelineIdFromGraph(graph, current.activeTimelineId);
    return {
      ...current,
      graph,
      activeTimelineId,
      messages: this.toUiMessages(graph, activeTimelineId),
      provider: current.provider || this.readSessionProvider(graph.session) || appEnv.defaultAiProvider,
      model: current.model || this.readSessionModel(graph.session) || appEnv.defaultAiModel,
      loading: false,
    };
  }

  private resolveTimelineIdFromGraph(
    graph: IAiSessionGraphResponse | null,
    preferredTimelineId?: string | null,
  ): string | null {
    if (!graph) {
      return null;
    }

    if (preferredTimelineId && graph.timelines.some((timeline) => timeline.id === preferredTimelineId)) {
      return preferredTimelineId;
    }

    return (
      graph.session.defaultTimelineId ||
      graph.timelines.find((timeline: IAiSessionTimelineDto) => timeline.isDefault)?.id ||
      graph.timelines[0]?.id ||
      null
    );
  }

  private toUiMessages(graph: IAiSessionGraphResponse, timelineId: string | null): IUiChatMessage[] {
    if (!timelineId) {
      return [];
    }

    const timelineTurns = graph.timelineTurns
      .filter((timelineTurn) => timelineTurn.timelineId === timelineId)
      .sort((left, right) => left.index - right.index);
    const messagesByTurnId = new Map(
      graph.messages.map((message) => [message.turnId, [] as typeof graph.messages]),
    );

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
          role: message.role,
          content: message.content,
        })),
    );
  }

  private syncSessionListEntry(session: IAiSessionResponse): void {
    this.sessions.update((sessions) => {
      const existingIndex = sessions.findIndex((item) => item.id === session.id);
      if (existingIndex === -1) {
        return [session, ...sessions];
      }

      return sessions.map((item) => (item.id === session.id ? { ...item, ...session } : item));
    });
  }

  private async refreshSessionGraphUntil(
    sessionId: string,
    timelineId: string,
    minimumMessageCount: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await this.refreshSessionGraph(sessionId, timelineId);
      if ((this.sessionState(sessionId)?.messages.length ?? 0) >= minimumMessageCount) {
        return;
      }

      await new Promise((resolve) => globalThis.setTimeout(resolve, 75));
    }
  }

  private buildUserMessageContent(
    prompt: string,
    attachments: IChatComposerAttachment[],
  ): AiMessageContent {
    if (attachments.length === 0) {
      return prompt;
    }

    const parts: AiContentPart[] = [];

    if (prompt) {
      parts.push({ type: 'text', text: prompt });
    }

    for (const attachment of attachments) {
      parts.push(attachment.part);
    }

    return parts;
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof DOMException && error.name === 'AbortError'
    ) || (
      error instanceof Error && error.name === 'AbortError'
    );
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      return (
        (error.error as IProblemDetails).detail ||
        (error.error as IProblemDetails).title ||
        'AI session request failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'AI session request failed.';
  }
}
