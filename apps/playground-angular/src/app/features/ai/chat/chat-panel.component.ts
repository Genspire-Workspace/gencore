// file: apps\playground-angular\src\app\features\ai\chat\chat-panel.component.ts

import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHistoryComponent } from './chat-history.component';
import { ChatComposerComponent } from './chat-composer.component';
import type { IChatComposerAttachment, IUiChatMessage } from './chat-message.types';

@Component({
  selector: 'app-ai-chat-panel',
  host: {
    class:
      'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm',
  },
  imports: [CommonModule, ChatHistoryComponent, ChatComposerComponent],
  template: `
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold text-base-content">
        {{ title() || 'Untitled session' }}
      </h2>
      <span
        class="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70"
      >
        {{ messages().length }} message{{ messages().length === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <app-ai-chat-history [messages]="messages()" [loading]="loading()" />

      <div class="mt-6">
        <app-ai-chat-composer
          [(prompt)]="prompt"
          [(attachments)]="attachments"
          [sending]="sending()"
          (submit)="send.emit()"
          (cancel)="cancel.emit()"
        />
      </div>
    </div>
  `,
})
export class ChatPanelComponent {
  readonly title = input('');
  readonly messages = input.required<IUiChatMessage[]>();
  readonly loading = input(false);
  readonly sending = input(false);

  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);

  readonly send = output<void>();
  readonly cancel = output<void>();
}
