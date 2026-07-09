// file: apps\playground-angular\src\app\features\ai\chat\chat-history.component.ts

import { Component, effect, ElementRef, inject, input, model, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessageBubbleAssistantComponent } from './chat-message-bubble-assistant.component';
import { ChatMessageBubbleUserComponent } from './chat-message-bubble-user.component';
import type {
  IChatComposerAttachment,
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';
import { ScrollService } from '../../../shared/scroll';

@Component({
  selector: 'app-ai-chat-history',
  host: {
    class: 'block flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-base border border-base-300 p-4',
  },
  imports: [CommonModule, ChatMessageBubbleAssistantComponent, ChatMessageBubbleUserComponent],
  template: `
    @if (messages().length === 0 && !loading()) {
      <div
        class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center text-sm text-base-content/60"
      >
        Start a session and send a message to see streamed responses.
      </div>
    } @else {
      <div
        #scrollContainer
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2"
        (scroll)="onScroll()"
      >
        @for (message of messages(); track message.id) {
          <div class="group flex w-full">
            @if (message.role === 'user') {
              <app-ai-chat-message-bubble-user
                [message]="message"
                [editing]="message.id === editingMessageId()"
                [sending]="sending()"
                [(prompt)]="editingPrompt"
                [(attachments)]="editingAttachments"
                (edit)="edit.emit($event)"
                (submit)="submit.emit()"
                (cancel)="cancel.emit()"
                (cancelEdit)="cancelEdit.emit()"
              />
            } @else {
              <app-ai-chat-message-bubble-assistant
                [message]="message"
                (feedback)="feedback.emit($event)"
                (regenerate)="regenerate.emit($event)"
                (branch)="branch.emit($event)"
              />
            }
          </div>
        }
      </div>
    }
  `,
})
export class ChatHistoryComponent {
  readonly sessionId = input<string | null>(null);
  readonly messages = input.required<IUiChatMessage[]>();
  readonly editingMessageId = input<string | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);
  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);
  readonly editingPrompt = model('');
  readonly editingAttachments = model<IChatComposerAttachment[]>([]);
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly submit = output<void>();
  readonly cancel = output<void>();
  readonly cancelEdit = output<void>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();

  private readonly scrollService = inject(ScrollService);
  private readonly scrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  private previousSessionId: string | null = null;
  private previousSending = false;
  private shouldFollowStreaming = true;

  onScroll(): void {
    const container = this.scrollContainerRef()?.nativeElement;
    if (!container) {
      return;
    }

    this.shouldFollowStreaming = this.isNearBottom(container);
  }

  constructor() {
    effect(() => {
      const container = this.scrollContainerRef()?.nativeElement;
      const sessionId = this.sessionId();
      const sending = this.sending();

      this.messages();
      this.loading();

      if (!container) {
        this.previousSessionId = sessionId;
        this.previousSending = sending;
        return;
      }

      const sessionChanged = sessionId !== this.previousSessionId;
      const startedSending = sending && !this.previousSending;
      const shouldScrollWhileStreaming = sending && this.shouldFollowStreaming;

      queueMicrotask(() => {
        if (sessionChanged) {
          this.shouldFollowStreaming = true;
          this.scrollService.scrollDown({
            container,
            behavior: 'auto',
          });
        } else if (startedSending) {
          this.shouldFollowStreaming = true;
          this.scrollService.scrollDown({
            container,
            behavior: 'smooth',
          });
        } else if (shouldScrollWhileStreaming) {
          this.scrollService.scrollDown({
            container,
            behavior: 'smooth',
          });
        }

        this.previousSessionId = sessionId;
        this.previousSending = sending;
      });
    });
  }

  private isNearBottom(container: HTMLDivElement): boolean {
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= 100;
  }
}
