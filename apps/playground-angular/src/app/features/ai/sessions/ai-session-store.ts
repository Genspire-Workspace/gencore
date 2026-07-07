// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-store.ts

import { Injectable, inject, signal } from '@angular/core';
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
  IAiSessionMessageDto,
  IAiSessionResponse,
  IAiSessionStreamChunk,
} from './ai-session-types';
import type { IProblemDetails } from '../../../core/problem-details';

@Injectable()
export class AiSessionStore {
  private readonly aiSessionService = inject(AiSessionService);
  private activeStreamController: AbortController | null = null;

  readonly session = signal<IAiSessionResponse | null>(null);
  readonly timelineId = signal<string | null>(null);
  readonly sessions = signal<IAiSessionResponse[]>([]);
  readonly messages = signal<IUiChatMessage[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly streamStatus = signal('');
  readonly prompt = signal('');
  readonly attachments = signal<IChatComposerAttachment[]>([]);
  readonly provider = signal(appEnv.defaultAiProvider);
  readonly model = signal(appEnv.defaultAiModel);

  async reloadSession(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.streamStatus.set('');

    try {
      await this.reloadSessionListInternal();
      const session = await this.aiSessionService.ensureSession();
      const timelineId = await this.resolveTimelineId(session);
      this.session.set(session);
      this.timelineId.set(timelineId);
      this.provider.set(this.readSessionProvider(session) || appEnv.defaultAiProvider);
      this.model.set(this.readSessionModel(session) || appEnv.defaultAiModel);
      this.messages.set(await this.loadMessages(session.id, timelineId));
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async newSession(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.streamStatus.set('');

    try {
      const session = await this.aiSessionService.createSession({
        type: 'chat',
        settings: this.buildSessionSettings(),
        metadata: {
          source: 'playground-angular',
        },
      });
      const timelineId = await this.resolveTimelineId(session);

      this.session.set(session);
      this.timelineId.set(timelineId);
      this.messages.set([]);
      this.provider.set(this.readSessionProvider(session) || appEnv.defaultAiProvider);
      this.model.set(this.readSessionModel(session) || appEnv.defaultAiModel);
      await this.reloadSessionListInternal();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async openSession(sessionId: string): Promise<void> {
    if (this.loading() || this.sending()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.streamStatus.set('');

    try {
      const session = await this.aiSessionService.activateSession(sessionId);
      if (!session) {
        await this.reloadSessionListInternal();
        throw new Error('Session was not found.');
      }

      const timelineId = await this.resolveTimelineId(session);

      this.session.set(session);
      this.timelineId.set(timelineId);
      this.provider.set(this.readSessionProvider(session) || appEnv.defaultAiProvider);
      this.model.set(this.readSessionModel(session) || appEnv.defaultAiModel);
      this.messages.set(await this.loadMessages(session.id, timelineId));
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async reloadSessionList(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.reloadSessionListInternal();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(): Promise<void> {
    const prompt = this.prompt().trim();
    const attachments = this.attachments();
    if ((prompt.length === 0 && attachments.length === 0) || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.error.set('');
    this.streamStatus.set('Waiting for stream...');

    let session = this.session() ?? (await this.aiSessionService.ensureSession());
    const timelineId = this.timelineId() ?? (await this.resolveTimelineId(session));
    const nextSettings = this.buildSessionSettings(session);

    if (!this.areSessionSettingsEqual(session, nextSettings)) {
      session = await this.aiSessionService.updateSession(session.id, {
        settings: nextSettings,
      });
    }

    this.session.set(session);
    this.timelineId.set(timelineId);

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

    this.messages.update((messages) => [...messages, userMessage, assistantMessage]);

    this.prompt.set('');
    this.attachments.set([]);

    let assembly = createAiSessionStreamAssembly();
    const streamController = new AbortController();
    this.activeStreamController = streamController;

    try {
      await this.aiSessionService.streamMessage(
        session.id,
        timelineId,
        {
          content,
          provider: this.provider().trim() || undefined,
          model: this.model().trim() || undefined,
          settings: {
            reasoningEffort: 'none',
          },
          metadata: {
            source: 'playground-angular',
          },
        },
        (chunk: IAiSessionStreamChunk) => {
          assembly = applyAiSessionStreamChunk(assembly, chunk);

          if (chunk.type === 'heartbeat') {
            this.streamStatus.set(
              `Streaming... ${this.readHeartbeatToolName(chunk.metadata) || 'waiting for provider'} (${Math.floor((chunk.elapsedMs || 0) / 1000)}s)`,
            );
          } else if (chunk.type === 'completed') {
            this.streamStatus.set('Stream finished. Reloading saved history...');
          } else if (chunk.type === 'error') {
            this.streamStatus.set('Stream returned an error.');
          } else {
            this.streamStatus.set('Streaming assistant reply...');
          }

          const assistantText = resolveAiSessionAssistantText(assembly);
          this.messages.update((messages) =>
            messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    content: assistantText,
                    pending: !assembly.finished,
                  }
                : message,
            ),
          );
        },
        {
          signal: streamController.signal,
        },
      );

      if (assembly.error) {
        throw new Error(assembly.error);
      }

      this.messages.set(await this.loadMessages(session.id, timelineId));
      await this.reloadSessionListInternal();
      this.streamStatus.set('Latest assistant turn saved.');
    } catch (error) {
      const stopped = this.isAbortError(error);
      if (!stopped) {
        this.error.set(this.readErrorMessage(error));
        this.streamStatus.set('');
      } else {
        this.error.set('');
        this.streamStatus.set('Stream stopped.');
      }

      this.messages.update((messages) =>
        messages.map((message) =>
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
      );
    } finally {
      if (this.activeStreamController === streamController) {
        this.activeStreamController = null;
      }
      this.sending.set(false);
    }
  }

  stopStreaming(): void {
    this.activeStreamController?.abort();
  }

  readSessionProvider(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).provider || '';
  }

  readSessionModel(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).model || '';
  }

  private async loadMessages(sessionId: string, timelineId: string): Promise<IUiChatMessage[]> {
    const turns = await this.aiSessionService.listTimelineTurns(sessionId, timelineId);
    return turns.flatMap((turn) =>
      turn.messages.map((message: IAiSessionMessageDto) => this.toUiMessage(message)),
    );
  }

  private async reloadSessionListInternal(): Promise<void> {
    this.sessions.set(await this.aiSessionService.listSessions());
  }

  private toUiMessage(message: IAiSessionMessageDto): IUiChatMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
    };
  }

  private async resolveTimelineId(session: IAiSessionResponse): Promise<string> {
    const timelineId = session.defaultTimeline?.id || session.defaultTimelineId;
    if (timelineId) {
      return timelineId;
    }

    const graph = await this.aiSessionService.getSessionGraph(session.id);
    const fallbackTimelineId =
      graph.session.defaultTimelineId ||
      graph.timelines.find((timeline: { isDefault: boolean }) => timeline.isDefault)?.id ||
      graph.timelines[0]?.id;

    if (!fallbackTimelineId) {
      throw new Error('Session does not have an active timeline.');
    }

    return fallbackTimelineId;
  }

  private buildSessionSettings(session?: IAiSessionResponse | null): Record<string, unknown> {
    const current = this.readSessionSettings(session ?? null);
    const provider = this.provider().trim();
    const model = this.model().trim();

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
