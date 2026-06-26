// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-page.component.ts

import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  OverlayModule,
} from '@angular/cdk/overlay';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { appEnv } from '../../../core/app-env';
import { AiSessionService } from './ai-session.service';
import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  resolveAiSessionAssistantText,
} from './ai-session-stream';
import { readAiContentText } from '../shared/ai-content';
import { AiSkillService } from '../skills/ai-skill.service';
import type { IAiSkillResponseDto } from '../skills/ai-skill.types';
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

interface ISkillTokenState {
  isOpen: boolean;
  query: string;
  startIndex: number;
  activeIndex: number;
}

const CLOSED_TOKEN: ISkillTokenState = {
  isOpen: false,
  query: '',
  startIndex: -1,
  activeIndex: 0,
};

@Component({
  selector: 'app-ai-session-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule, OverlayModule],
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
              Create one session, stream replies from the backend, and navigate
              across saved sessions from the sidebar.
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
                      {{ item.provider || 'provider?' }} / {{ item.model || 'model?' }}
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
              @if (selectedSkills().length > 0) {
                <div class="flex flex-wrap gap-2">
                  @for (skill of selectedSkills(); track skill.id) {
                    <button
                      type="button"
                      class="group inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
                      (click)="removeSelectedSkill(skill.id)"
                    >
                      <span>{{ skill.name }}</span>
                      <span class="text-sky-500 group-hover:text-sky-700">x</span>
                    </button>
                  }
                </div>
              }

              <div
                class="relative"
                #composerOrigin="cdkOverlayOrigin"
                cdkOverlayOrigin
              >
                <textarea
                  #composer
                  class="min-h-28 w-full resize-y rounded-3xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
                  [ngModel]="prompt()"
                  (ngModelChange)="onPromptChange($event)"
                  (keydown)="onComposerKeyDown($event)"
                  (blur)="onComposerBlur()"
                  name="prompt"
                  placeholder="Ask something like: What is the capital of Spain? Type '/' to add a skill."
                  required
                ></textarea>
              </div>

              <ng-template
                cdkConnectedOverlay
                [cdkConnectedOverlayOrigin]="composerOrigin"
                [cdkConnectedOverlayOpen]="skillToken().isOpen"
                [cdkConnectedOverlayPositions]="overlayPositions"
                [cdkConnectedOverlayWidth]="composerWidth() ?? 0"
              >
                @if (skillToken().isOpen) {
                  <div class="skill-picker-panel">
                    @if (skillsLoading()) {
                      <div class="skill-picker-empty">Loading skills...</div>
                    } @else if (filteredSkills().length === 0) {
                      <div class="skill-picker-empty">
                        No skills match "{{ skillToken().query }}"
                      </div>
                    } @else {
                      <ul class="skill-picker-list" role="listbox">
                        @for (skill of filteredSkills(); track skill.id; let i = $index) {
                          <li
                            role="option"
                            [class.skill-picker-item--active]="i === skillToken().activeIndex"
                            [class.skill-picker-item--selected]="isSkillSelected(skill.id)"
                            (mouseenter)="skillToken.set((s) => ({ ...s, activeIndex: i }))"
                            (mousedown)="$event.preventDefault()"
                            (click)="selectActiveSkill()"
                          >
                            <div class="skill-picker-item-row">
                              <span class="skill-picker-item-name">{{ skill.name }}</span>
                              @if (isSkillSelected(skill.id)) {
                                <span class="skill-picker-item-check">selected</span>
                              }
                            </div>
                            <div class="skill-picker-item-desc">{{ skill.description }}</div>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
              </ng-template>

              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-slate-500">
                  Stream endpoint: <code>/ai/sessions/:id/messages/stream</code>
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
  styles: [`
    .skill-picker-panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.18);
      max-height: 16rem;
      overflow-y: auto;
      padding: 0.25rem;
    }
    .skill-picker-empty {
      padding: 0.75rem 1rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .skill-picker-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .skill-picker-item--active {
      background: #f1f5f9;
    }
    .skill-picker-item--selected {
      background: #eff6ff;
    }
    .skill-picker-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }
    .skill-picker-item-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f172a;
    }
    .skill-picker-item-check {
      font-size: 0.6875rem;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .skill-picker-item-desc {
      padding: 0 0.75rem 0.5rem;
      font-size: 0.75rem;
      color: #64748b;
    }
  `],
})
export class AiSessionPageComponent {
  private readonly aiSessionService = inject(AiSessionService);
  private readonly aiSkillService = inject(AiSkillService);

  protected readonly session = signal<IAiSessionResponse | null>(null);
  protected readonly sessions = signal<IAiSessionResponse[]>([]);
  protected readonly messages = signal<IUiChatMessage[]>([]);
  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly streamStatus = signal('');
  protected readonly prompt = signal('');
  protected readonly provider = signal(appEnv.defaultAiProvider);
  protected readonly model = signal(appEnv.defaultAiModel);

  protected readonly availableSkills = signal<IAiSkillResponseDto[]>([]);
  protected readonly skillsLoading = signal(false);
  protected readonly selectedSkills = signal<IAiSkillResponseDto[]>([]);
  protected readonly skillToken = signal<ISkillTokenState>({ ...CLOSED_TOKEN });

  protected readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  protected readonly filteredSkills = computed(() => {
    const query = this.skillToken().query.trim().toLowerCase();
    const available = this.availableSkills();

    if (!query) {
      return available;
    }

    return available.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query),
    );
  });

  protected readonly composerWidth = signal<number | null>(null);

  protected readonly overlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
    },
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
  ];

  constructor() {
    void this.reloadSession();
    void this.loadSkills();

    effect(() => {
      if (!this.skillToken().isOpen) {
        return;
      }
      this.ensureComposerWidth();
    });
  }

  protected async reloadSession(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.streamStatus.set('');

    try {
      await this.reloadSessionListInternal();
      const session = await this.aiSessionService.ensureSession();
      this.session.set(session);
      this.provider.set(session.provider || appEnv.defaultAiProvider);
      this.model.set(session.model || appEnv.defaultAiModel);
      this.messages.set(await this.loadMessages(session.id));
      this.selectedSkills.set([]);
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
        provider: this.provider(),
        model: this.model(),
        metadata: {
          source: 'playground-angular',
        },
      });

      this.session.set(session);
      this.messages.set([]);
      this.selectedSkills.set([]);
      this.provider.set(session.provider || appEnv.defaultAiProvider);
      this.model.set(session.model || appEnv.defaultAiModel);
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

      this.session.set(session);
      this.provider.set(session.provider || appEnv.defaultAiProvider);
      this.model.set(session.model || appEnv.defaultAiModel);
      this.messages.set(await this.loadMessages(session.id));
      this.selectedSkills.set([]);
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

  protected onPromptChange(value: string): void {
    this.prompt.set(value);
    this.evaluateSkillToken();
  }

  protected onComposerKeyDown(event: KeyboardEvent): void {
    if (this.skillToken().isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.moveActiveSkill(1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.moveActiveSkill(-1);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        this.selectActiveSkill();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeSkillPicker();
        return;
      }
    }
  }

  protected onComposerBlur(): void {
    window.setTimeout(() => {
      if (this.skillToken().isOpen) {
        this.closeSkillPicker();
      }
    }, 150);
  }

  protected closeSkillPicker(): void {
    if (!this.skillToken().isOpen) {
      return;
    }

    this.skillToken.set({ ...CLOSED_TOKEN });
  }

  protected isSkillSelected(skillId: string): boolean {
    return this.selectedSkills().some((skill) => skill.id === skillId);
  }

  protected selectActiveSkill(): void {
    const token = this.skillToken();
    if (!token.isOpen) {
      return;
    }

    const skills = this.filteredSkills();
    const skill = skills[token.activeIndex];
    if (!skill) {
      return;
    }

    this.toggleSelectedSkill(skill);
  }

  protected removeSelectedSkill(skillId: string): void {
    this.selectedSkills.update((skills) =>
      skills.filter((skill) => skill.id !== skillId),
    );
  }

  protected async sendMessage(): Promise<void> {
    const content = this.prompt().trim();
    if (!content || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.error.set('');
    this.streamStatus.set('Waiting for stream...');
    this.closeSkillPicker();

    const session = this.session() ?? await this.aiSessionService.ensureSession();
    this.session.set(session);

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
      const selectedSkillIds = this.selectedSkills().map((skill) => skill.id);
      await this.aiSessionService.streamMessage(
        session.id,
        {
          content,
          provider: this.provider(),
          model: this.model(),
          systemPrompt: selectedSkillIds.length > 0
            ? 'You are concise and must follow the attached skills.'
            : undefined,
          skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
          settings: {
            reasoningEffort: 'none',
            toolChoice: 'auto',
            maxToolSteps: 6,
          },
          metadata: {
            source: 'playground-angular',
          },
        },
        (chunk) => {
          assembly = applyAiSessionStreamChunk(assembly, chunk);

          if (chunk.type === 'heartbeat') {
            this.streamStatus.set(
              `Streaming... ${chunk.toolName || 'waiting for provider'} (${Math.floor((chunk.elapsedMs || 0) / 1000)}s)`,
            );
          } else if (chunk.type === 'finish') {
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

      this.messages.set(await this.loadMessages(session.id));
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

  private async loadSkills(): Promise<void> {
    this.skillsLoading.set(true);
    try {
      this.availableSkills.set(await this.aiSkillService.list());
    } catch {
      this.availableSkills.set([]);
    } finally {
      this.skillsLoading.set(false);
    }
  }

  private evaluateSkillToken(): void {
    const textarea = this.composer()?.nativeElement;
    if (!textarea) {
      return;
    }

    const value = textarea.value;
    const caret = textarea.selectionStart ?? value.length;

    const slashIndex = this.findSkillTokenStart(value, caret);

    if (slashIndex === -1) {
      this.closeSkillPicker();
      return;
    }

    const query = value.slice(slashIndex + 1, caret);

    if (query.includes('\n') || query.includes(' ')) {
      this.closeSkillPicker();
      return;
    }

    this.ensureComposerWidth();

    this.skillToken.set({
      isOpen: true,
      query,
      startIndex: slashIndex,
      activeIndex: 0,
    });
  }

  private findSkillTokenStart(value: string, caret: number): number {
    for (let i = caret - 1; i >= 0; i -= 1) {
      const ch = value[i];
      if (ch === '\n') {
        return -1;
      }
      if (ch === ' ' || ch === '\t') {
        return -1;
      }
      if (ch === '/') {
        if (i === 0 || /\s/.test(value[i - 1] ?? '')) {
          return i;
        }
        return -1;
      }
    }
    return -1;
  }

  private moveActiveSkill(delta: number): void {
    const skills = this.filteredSkills();
    if (skills.length === 0) {
      return;
    }

    this.skillToken.update((token) => {
      let next = token.activeIndex + delta;
      if (next < 0) {
        next = skills.length - 1;
      }
      if (next >= skills.length) {
        next = 0;
      }
      return { ...token, activeIndex: next };
    });
  }

  private toggleSelectedSkill(skill: IAiSkillResponseDto): void {
    const isSelected = this.isSkillSelected(skill.id);
    if (isSelected) {
      this.selectedSkills.update((skills) =>
        skills.filter((s) => s.id !== skill.id),
      );
    } else {
      this.selectedSkills.update((skills) => [...skills, skill]);
    }

    this.removeTokenFromPrompt();
    this.closeSkillPicker();
    this.composer()?.nativeElement.focus();
  }

  private removeTokenFromPrompt(): void {
    const textarea = this.composer()?.nativeElement;
    if (!textarea) {
      return;
    }

    const token = this.skillToken();
    if (token.startIndex < 0) {
      return;
    }

    const value = textarea.value;
    const before = value.slice(0, token.startIndex);
    const after = value.slice(textarea.selectionStart ?? value.length);

    const nextValue = `${before}${after}`;
    this.prompt.set(nextValue);

    textarea.value = nextValue;
    textarea.selectionStart = token.startIndex;
    textarea.selectionEnd = token.startIndex;
  }

  private ensureComposerWidth(): void {
    const textarea = this.composer()?.nativeElement;
    if (!textarea) {
      return;
    }
    this.composerWidth.set(textarea.getBoundingClientRect().width);
  }

  private async loadMessages(sessionId: string): Promise<IUiChatMessage[]> {
    const messages = await this.aiSessionService.listMessages(sessionId);
    return messages.map((message) => this.toUiMessage(message));
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