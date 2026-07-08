// file: apps\playground-angular\src\app\features\ai\chat\chat-panel.component.ts

import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHistoryComponent } from './chat-history.component';
import { ChatComposerComponent } from './chat-composer.component';
import type {
  IChatComposerAttachment,
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';

@Component({
  selector: 'app-ai-chat-panel',
  host: {
    class:
      'flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-4',
  },
  imports: [CommonModule, ChatHistoryComponent, ChatComposerComponent],
  template: `
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold text-base-content">
        {{ title() || 'Untitled session' }}
      </h2>
      <span class="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70">
        {{ messages().length }} message{{ messages().length === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <app-ai-chat-history
        [sessionId]="sessionId()"
        [messages]="messages()"
        [loading]="loading()"
        [sending]="sending()"
        (edit)="edit.emit($event)"
        (feedback)="feedback.emit($event)"
        (regenerate)="regenerate.emit($event)"
        (branch)="branch.emit($event)"
      />
      <app-ai-chat-composer
        [(prompt)]="prompt"
        [(attachments)]="attachments"
        [sending]="sending()"
        (submit)="send.emit()"
        (cancel)="cancel.emit()"
      />
    </div>
  `,
})
export class ChatPanelComponent {
  readonly sessionId = input<string | null>(null);
  readonly title = input('');
  readonly messages = input.required<IUiChatMessage[]>();
  readonly loading = input(false);
  readonly sending = input(false);

  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);

  readonly send = output<void>();
  readonly cancel = output<void>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();
}
