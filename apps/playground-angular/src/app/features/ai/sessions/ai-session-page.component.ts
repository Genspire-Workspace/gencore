// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-page.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiSessionStore } from './ai-session-store';
import { SessionSidebarComponent } from './components/session-sidebar.component';
import { ChatPanelComponent } from '../chat/chat-panel.component';

@Component({
  selector: 'app-ai-session-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, SessionSidebarComponent, ChatPanelComponent],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="mt-6 grid min-h-0 flex-1 auto-rows-fr gap-6 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]"
      >
        <app-ai-session-sidebar
          [sessions]="store.sessions()"
          [activeSessionId]="store.selectedSessionId()"
          [loading]="store.loading()"
          [sending]="store.sending()"
          [streamStatus]="store.streamStatus()"
          [error]="store.error()"
          [provider]="store.currentProvider()"
          (providerChange)="store.setCurrentProvider($event)"
          [model]="store.currentModel()"
          (modelChange)="store.setCurrentModel($event)"
          (newSession)="store.newSession()"
          (refreshList)="store.reloadSessionList()"
          (openSession)="store.openSession($event)"
        />

        <app-ai-chat-panel
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
      </div>
    </section>
  `,
  providers: [AiSessionStore],
})
export class AiSessionPageComponent {
  protected readonly store = inject(AiSessionStore);

  constructor() {
    void this.store.reloadSession();
  }
}
