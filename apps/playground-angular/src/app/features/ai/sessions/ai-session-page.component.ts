// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-page.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { appEnv } from '../../../core/app-env';
import { AiSessionService } from './ai-session.service';
import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  resolveAiSessionAssistantText,
} from './ai-session-stream';
import { readAiContentText } from '../shared/ai-content';
import type {
  IAiSessionMessageDto,
  IAiSessionResponse,
} from './ai-session-types';
import type { IProblemDetails } from '../../../core/problem-details';

interface IUiChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  pending?: boolean;
}

@Component({
  selector: 'app-ai-session-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
              AI
            </p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Session playground
            </h1>
            <p class="mt-3 max-w-2xl text-sm text-slate-500">
              Create one session, stream timeline turns from the backend, and
              navigate across saved sessions from the sidebar.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="reloadSession()"
              [disabled]="loading() || sending()"
            >
              Refresh history
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 grid min-h-0 flex-1 auto-rows-fr gap-6 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside class="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-900">Sessions</h2>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {{ sessions().length }}
            </span>
          </div>

          <div class="mt-4 space-y-3">
            <button
              class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              (click)="newSession()"
              [disabled]="loading() || sending()"
            >
              New session
            </button>

            <button
              class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="reloadSessionList()"
              [disabled]="loading() || sending()"
            >
              Refresh sessions
            </button>
          </div>

          <div class="mt-6 min-h-0 flex-1 overflow-hidden">
            @if (sessions().length === 0 && !loading()) {
              <div class="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                No sessions yet.
              </div>
            } @else {
              <div class="h-full space-y-3 overflow-y-auto pr-2">
                @for (item of sessions(); track item.id) {
                  <button
                    class="block w-full rounded-2xl border px-4 py-3 text-left transition"
                    [class.border-sky-300]="item.id === session()?.id"
                    [class.bg-sky-50]="item.id === session()?.id"
                    [class.text-sky-900]="item.id === session()?.id"
                    [class.border-slate-200]="item.id !== session()?.id"
                    [class.bg-white]="item.id !== session()?.id"
                    [class.text-slate-800]="item.id !== session()?.id"
                    type="button"
                    (click)="openSession(item.id)"
                    [disabled]="sending()"
                  >
                    <div class="text-sm font-semibold">
                      {{ item.title || 'Untitled session' }}
                    </div>
                    <div class="mt-1 text-xs text-slate-500">
                      {{ readSessionProvider(item) || 'provider?' }} /
                      {{ readSessionModel(item) || 'model?' }}
                    </div>
                    <div class="mt-2 break-all text-[11px] text-slate-400">
                      {{ item.id }}
                    </div>
                  </button>
                }
              </div>
            }
          </div>

          <div class="mt-8 shrink-0 border-t border-slate-200 pt-6">
            <h3 class="text-lg font-semibold text-slate-900">Session config</h3>

            <div class="mt-6 space-y-4">
              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Provider</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="provider()"
                  (ngModelChange)="provider.set($event)"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Model</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="model()"
                  (ngModelChange)="model.set($event)"
                />
              </label>
            </div>
          </div>

          @if (streamStatus()) {
            <div class="mt-4 shrink-0 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {{ streamStatus() }}
            </div>
          }

          @if (error()) {
            <div class="mt-4 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ error() }}
            </div>
          }
        </aside>

        <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-semibold text-slate-900">
              {{ session()?.title || 'Untitled session' }}
            </h2>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {{ messages().length }} message{{ messages().length === 1 ? '' : 's' }}
            </span>
          </div>

          <div class="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-slate-50 p-4">
              @if (messages().length === 0 && !loading()) {
                <div class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                  Start a session and send a message to see streamed responses.
                </div>
              } @else {
                <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
                  @for (message of messages(); track message.id) {
                    <article
                      class="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm"
                      [class.self-end]="message.role === 'user'"
                      [class.bg-slate-900]="message.role === 'user'"
                      [class.text-white]="message.role === 'user'"
                      [class.bg-white]="message.role !== 'user'"
                      [class.text-slate-800]="message.role !== 'user'"
                      [class.border]="message.role !== 'user'"
                      [class.border-slate-200]="message.role !== 'user'"
                    >
                      <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
                        {{ message.role }}
                      </div>
                      <div class="whitespace-pre-wrap">
                        {{ message.content || (message.pending ? 'Streaming...' : '') }}
                      </div>
                    </article>
                  }
                </div>
              }
            </div>

            <form class="mt-6 flex flex-col gap-3" (ngSubmit)="sendMessage()">
              <textarea
                class="min-h-28 w-full resize-y rounded-3xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
                [ngModel]="prompt()"
                (ngModelChange)="prompt.set($event)"
                name="prompt"
                placeholder="Ask something like: What is the capital of Spain?"
                required
              ></textarea>

              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-slate-500">
                  Stream endpoint:
                  <code>/api/v1/ai/sessions/:id/timelines/:timelineId/generate</code>
                </p>
                <button
                  class="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  type="submit"
                  [disabled]="sending() || !prompt().trim()"
                >
                  {{ sending() ? 'Streaming...' : 'Send message' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AiSessionPageComponent {
  private readonly aiSessionService = inject(AiSessionService);

  protected readonly session = signal<IAiSessionResponse | null>(null);
  protected readonly timelineId = signal<string | null>(null);
  protected readonly sessions = signal<IAiSessionResponse[]>([]);
  protected readonly messages = signal<IUiChatMessage[]>([]);
  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly streamStatus = signal('');
  protected readonly prompt = signal('');
  protected readonly provider = signal(appEnv.defaultAiProvider);
  protected readonly model = signal(appEnv.defaultAiModel);

  constructor() {
    void this.reloadSession();
  }

  protected async reloadSession(): Promise<void> {
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

  protected async newSession(): Promise<void> {
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

  protected async openSession(sessionId: string): Promise<void> {
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

  protected async reloadSessionList(): Promise<void> {
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

  protected async sendMessage(): Promise<void> {
    const content = this.prompt().trim();
    if (!content || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.error.set('');
    this.streamStatus.set('Waiting for stream...');

    let session = this.session() ?? await this.aiSessionService.ensureSession();
    const timelineId = this.timelineId() ?? await this.resolveTimelineId(session);
    const nextSettings = this.buildSessionSettings(session);

    if (!this.areSessionSettingsEqual(session, nextSettings)) {
      session = await this.aiSessionService.updateSession(session.id, {
        settings: nextSettings,
      });
    }

    this.session.set(session);
    this.timelineId.set(timelineId);

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

    this.messages.update((messages) => [
      ...messages,
      userMessage,
      assistantMessage,
    ]);

    this.prompt.set('');

    let assembly = createAiSessionStreamAssembly();

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
        (chunk) => {
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
      );

      if (assembly.error) {
        throw new Error(assembly.error);
      }

      this.messages.set(await this.loadMessages(session.id, timelineId));
      await this.reloadSessionListInternal();
      this.streamStatus.set('Latest assistant turn saved.');
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
      this.streamStatus.set('');
      this.messages.update((messages) =>
        messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content:
                  resolveAiSessionAssistantText(assembly) ||
                  'Assistant stream failed.',
                pending: false,
              }
            : message,
        ),
      );
    } finally {
      this.sending.set(false);
    }
  }

  protected readSessionProvider(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).provider || '';
  }

  protected readSessionModel(session: IAiSessionResponse): string {
    return this.readSessionSettings(session).model || '';
  }

  private async loadMessages(
    sessionId: string,
    timelineId: string,
  ): Promise<IUiChatMessage[]> {
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
      content: readAiContentText(message.content),
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
      graph.timelines.find(
        (timeline: { isDefault: boolean }) => timeline.isDefault,
      )?.id ||
      graph.timelines[0]?.id;

    if (!fallbackTimelineId) {
      throw new Error('Session does not have an active timeline.');
    }

    return fallbackTimelineId;
  }

  private buildSessionSettings(
    session?: IAiSessionResponse | null,
  ): Record<string, unknown> {
    const current = this.readSessionSettings(session ?? null);
    const provider = this.provider().trim();
    const model = this.model().trim();

    return {
      ...current,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    };
  }

  private readSessionSettings(
    session: IAiSessionResponse | null,
  ): { provider?: string; model?: string; systemPrompt?: string } {
    const settings = session?.settings;
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return {
      provider:
        typeof settings['provider'] === 'string' ? settings['provider'] : undefined,
      model: typeof settings['model'] === 'string' ? settings['model'] : undefined,
      systemPrompt:
        typeof settings['systemPrompt'] === 'string'
          ? settings['systemPrompt']
          : undefined,
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

  private readErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      error.error &&
      typeof error.error === 'object'
    ) {
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
