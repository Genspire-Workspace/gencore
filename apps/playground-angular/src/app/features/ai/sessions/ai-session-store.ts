// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-store.ts

import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { appEnv } from '../../../core/app-env';
import { AiSessionService } from './ai-session.service';
import type {
  IChatComposerAttachment,
  IUiChatMessage,
  IUiChatMessageFeedbackValue,
} from '../chat/chat-message.types';
import type {
  IAiSessionConfigDraft,
  IAiSessionClientState,
  IAiSessionGraphResponse,
  IAiSessionResponse,
  IAiSessionUpdateRequest,
  IAiSessionUiMessage,
  IAiSessionUiAttachment,
} from './ai-session-types';

@Injectable()
export class AiSessionStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly aiSessionService = inject(AiSessionService);
  private readonly workspace = this.aiSessionService.createWorkspaceManager();
  private readonly snapshot = signal(this.workspace.getSnapshot());

  readonly selectedSessionId = computed(() => this.snapshot().selectedSessionId);
  readonly sessions = computed(() => this.snapshot().sessions as IAiSessionResponse[]);
  readonly sessionListLoading = computed(() => this.snapshot().sessionListLoading);
  readonly sessionListError = computed(() => this.snapshot().sessionListError);

  readonly currentSessionState = computed<IAiSessionClientState | null>(() => {
    const snapshot = this.snapshot();
    const sessionId = snapshot.selectedSessionId;

    if (!sessionId) {
      return null;
    }

    return (snapshot.sessionStatesById[sessionId] as IAiSessionClientState | undefined) ?? null;
  });

  readonly currentSession = computed<IAiSessionResponse | null>(() => {
    const state = this.currentSessionState();
    if (state?.graph?.session) {
      return state.graph.session as IAiSessionResponse;
    }

    const snapshot = this.snapshot();
    const sessionId = snapshot.selectedSessionId;
    if (!sessionId) {
      return null;
    }

    return (snapshot.sessions.find((session) => session.id === sessionId) as IAiSessionResponse | undefined) ?? null;
  });

  readonly loading = computed(() => this.sessionListLoading() || this.currentSessionState()?.loading || false);
  readonly sending = computed(() => this.currentSessionState()?.sending || false);
  readonly error = computed(() => this.currentSessionState()?.error || this.sessionListError() || '');
  readonly streamStatus = computed(() => this.currentSessionState()?.streamStatus || '');
  readonly currentGraph = computed<IAiSessionGraphResponse | null>(
    () => (this.currentSessionState()?.graph as IAiSessionGraphResponse | null) ?? null,
  );
  readonly currentActiveTimelineId = computed(() => this.currentSessionState()?.activeTimelineId ?? null);
  readonly currentMessages = computed(() => this.currentSessionState()?.messages ?? []);
  readonly currentPrompt = computed(() => this.currentSessionState()?.prompt ?? '');
  readonly currentAttachments = computed(
    () => (this.currentSessionState()?.attachments ?? []) as IChatComposerAttachment[],
  );
  readonly currentEditingPrompt = computed(
    () => this.currentSessionState()?.editingDraft?.prompt ?? '',
  );
  readonly currentEditingAttachments = computed(
    () => (this.currentSessionState()?.editingDraft?.attachments ?? []) as IChatComposerAttachment[],
  );
  readonly currentProvider = computed(() => this.currentSessionState()?.provider ?? appEnv.defaultAiProvider);
  readonly currentModel = computed(() => this.currentSessionState()?.model ?? appEnv.defaultAiModel);

  constructor() {
    const unsubscribe = this.workspace.subscribe(() => {
      this.snapshot.set(this.workspace.getSnapshot());
    });

    this.destroyRef.onDestroy(unsubscribe);
  }

  async reloadSession(): Promise<void> {
    await this.workspace.reloadSession();
  }

  async newSession(): Promise<void> {
    await this.workspace.newSession();
  }

  async openSession(sessionId: string): Promise<void> {
    await this.workspace.openSession(sessionId);
  }

  async reloadSessionList(): Promise<void> {
    await this.workspace.reloadSessionList();
  }

  selectSession(sessionId: string | null): void {
    this.workspace.selectSession(sessionId);
  }

  async refreshSessionGraph(sessionId?: string, timelineId?: string): Promise<void> {
    await this.workspace.refreshSessionGraph(sessionId, timelineId);
  }

  async sendMessage(sessionId?: string): Promise<void> {
    await this.workspace.sendMessage(sessionId);
  }

  stopStreaming(sessionId?: string): void {
    this.workspace.stopStreaming(sessionId);
  }

  setCurrentPrompt(value: string): void {
    this.workspace.setCurrentPrompt(value);
  }

  setCurrentAttachments(value: IChatComposerAttachment[]): void {
    this.workspace.setCurrentAttachments(value as IAiSessionUiAttachment[]);
  }

  setCurrentEditingPrompt(value: string): void {
    this.workspace.setEditingPrompt(value);
  }

  setCurrentEditingAttachments(value: IChatComposerAttachment[]): void {
    this.workspace.setEditingAttachments(value as IAiSessionUiAttachment[]);
  }

  setCurrentProvider(value: string): void {
    this.workspace.setCurrentProvider(value);
  }

  setCurrentModel(value: string): void {
    this.workspace.setCurrentModel(value);
  }

  setActiveTimeline(timelineId: string | null): void {
    this.workspace.setActiveTimeline(timelineId);
  }

  async updateSessionConfig(
    sessionId: string,
    draft: IAiSessionConfigDraft,
  ): Promise<void> {
    const update: IAiSessionUpdateRequest = {
      title: draft.title.trim() || undefined,
      settings: {
        provider: draft.provider.trim() || undefined,
        model: draft.model.trim() || undefined,
        systemPrompt: draft.systemPrompt.trim() || undefined,
        temperature: this.parseOptionalNumber(draft.temperature),
        topP: this.parseOptionalNumber(draft.topP),
        maxTokens: this.parseOptionalInteger(draft.maxTokens),
      },
    };

    await this.workspace.updateSession(sessionId, update);
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await this.workspace.updateSession(sessionId, {
      title: title.trim() || undefined,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.workspace.deleteSession(sessionId);
  }

  beginEditMessage(message: IUiChatMessage): void {
    this.workspace.beginEditMessage(message as IAiSessionUiMessage);
  }

  cancelEditMessage(): void {
    this.workspace.cancelEditMessage();
  }

  async submitFeedback(
    message: IUiChatMessage,
    rating: IUiChatMessageFeedbackValue,
  ): Promise<void> {
    await this.workspace.submitFeedback(message as IAiSessionUiMessage, rating);
  }

  async branchFromMessage(message: IUiChatMessage): Promise<void> {
    await this.workspace.branchFromMessage(message as IAiSessionUiMessage);
  }

  async regenerateAssistantMessage(message: IUiChatMessage): Promise<void> {
    await this.workspace.regenerateAssistantMessage(message as IAiSessionUiMessage);
  }

  private parseOptionalNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalInteger(value: string): number | undefined {
    const parsed = this.parseOptionalNumber(value);
    return parsed === undefined ? undefined : Math.trunc(parsed);
  }
}
