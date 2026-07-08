// file: apps\playground-angular\src\app\features\ai\chat\chat-history.component.ts

import { Component, effect, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessageBubbleComponent } from './chat-message-bubble.component';
import type {
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';
import { ScrollService } from '../../../shared/scroll';

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
      <div #scrollContainer class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
        @for (message of messages(); track message.id) {
          <div class="flex w-full">
            <app-ai-chat-message-bubble
              [message]="message"
              (edit)="edit.emit($event)"
              (feedback)="feedback.emit($event)"
              (regenerate)="regenerate.emit($event)"
              (branch)="branch.emit($event)"
            />
          </div>
        }
      </div>
    }
  `,
})
export class ChatHistoryComponent {
  readonly messages = input.required<IUiChatMessage[]>();
  readonly loading = input(false);
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();

  private readonly scrollService = inject(ScrollService);
  private readonly scrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private previousMessageCount = 0;

  constructor() {
    effect(() => {
      const container = this.scrollContainerRef()?.nativeElement;
      const messageCount = this.messages().length;
      const loading = this.loading();

      if (!container || messageCount === 0) {
        this.previousMessageCount = messageCount;
        return;
      }

      queueMicrotask(() => {
        const behavior: ScrollBehavior =
          this.previousMessageCount > 0 || loading ? 'smooth' : 'auto';

        this.scrollService.scrollDown({
          container,
          behavior,
        });

        this.previousMessageCount = messageCount;
      });
    });
  }
}
