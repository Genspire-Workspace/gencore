// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-page.component.ts

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ChatPanelComponent } from '../chat/chat-panel.component';
import { AiSessionStore } from './ai-session-store';
import type { IAiSessionConfigDraft, IAiSessionResponse } from './ai-session-types';
import { SessionConfigFormComponent } from './components/session-config-form.component';
import { SessionSidebarComponent } from './components/session-sidebar.component';
import { StatusBannerComponent } from './components/status-banner.component';

@Component({
  selector: 'app-ai-session-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [
    CommonModule,
    SessionSidebarComponent,
    SessionConfigFormComponent,
    StatusBannerComponent,
    ChatPanelComponent,
  ],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div class="mt-6 grid min-h-0 flex-1 gap-6 overflow-hidden" [class]="layoutClass()">
        <app-ai-session-sidebar
          [sessions]="store.sessions()"
          [activeSessionId]="store.selectedSessionId()"
          [loading]="store.loading()"
          [sending]="store.sending()"
          (newSession)="store.newSession()"
          (refreshList)="store.reloadSessionList()"
          (openSession)="store.openSession($event)"
          (configureSession)="toggleSettings($event)"
        />

        <app-ai-chat-panel
          [sessionId]="store.selectedSessionId()"
          [title]="store.currentSession()?.title ?? ''"
          [messages]="store.currentMessages()"
          [loading]="store.loading()"
          [sending]="store.sending()"
          [prompt]="store.currentPrompt()"
          (promptChange)="store.setCurrentPrompt($event)"
          [attachments]="store.currentAttachments()"
          (attachmentsChange)="store.setCurrentAttachments($event)"
          (send)="store.sendMessage()"
          (cancel)="store.stopStreaming()"
          (edit)="store.beginEditMessage($event.message)"
          (feedback)="store.submitFeedback($event.message, $event.value)"
          (regenerate)="store.regenerateAssistantMessage($event.message)"
          (branch)="store.branchFromMessage($event.message)"
        />

        @if (configuredSession()) {
          <aside
            class="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm"
          >
            <div class="min-h-0 flex-1 overflow-y-auto">
              <app-ai-session-config-form
                [session]="configuredSession()!"
                (save)="saveSettings($event)"
                (cancel)="closeSettings()"
              />

              <app-ai-status-banner [message]="store.streamStatus()" severity="info" />
              <app-ai-status-banner [message]="store.error()" severity="danger" />
            </div>
          </aside>
        }
      </div>
    </section>
  `,
  providers: [AiSessionStore],
})
export class AiSessionPageComponent {
  protected readonly store = inject(AiSessionStore);
  protected readonly configuredSessionId = signal<string | null>(null);

  protected readonly configuredSession = computed<IAiSessionResponse | null>(() => {
    const sessionId = this.configuredSessionId();
    if (!sessionId) {
      return null;
    }

    const currentSession = this.store.currentSession();
    if (currentSession?.id === sessionId) {
      return currentSession;
    }

    return this.store.sessions().find((session) => session.id === sessionId) ?? null;
  });

  protected readonly layoutClass = computed(() =>
    this.configuredSession()
      ? 'xl:grid-cols-[20rem_minmax(0,1fr)_22rem]'
      : 'xl:grid-cols-[20rem_minmax(0,1fr)]',
  );

  constructor() {
    void this.store.reloadSession();
  }

  protected toggleSettings(sessionId: string): void {
    this.configuredSessionId.update((current) => current === sessionId ? null : sessionId);
  }

  protected closeSettings(): void {
    this.configuredSessionId.set(null);
  }

  protected async saveSettings(draft: IAiSessionConfigDraft): Promise<void> {
    const sessionId = this.configuredSessionId();
    if (!sessionId) {
      return;
    }

    await this.store.updateSessionConfig(sessionId, draft);
  }
}
