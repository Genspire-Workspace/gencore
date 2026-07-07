// file: apps\playground-angular\src\app\features\ai\chat\chat-history.component.ts

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessageBubbleComponent } from './chat-message-bubble.component';
import type { IUiChatMessage } from './chat-message.types';

@Component({
  selector: 'app-ai-chat-history',
  host: {
    class: 'block flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-base p-4',
  },
  imports: [CommonModule, ChatMessageBubbleComponent],
  template: `
    @if (messages().length === 0 && !loading()) {
      <div
        class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center text-sm text-base-content/60"
      >
        Start a session and send a message to see streamed responses.
      </div>
    } @else {
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
        @for (message of messages(); track message.id) {
          <div class="flex w-full">
            <app-ai-chat-message-bubble [message]="message" />
          </div>
        }
      </div>
    }
  `,
})
export class ChatHistoryComponent {
  readonly messages = input.required<IUiChatMessage[]>();
  readonly loading = input(false);
}
