import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ChatMessageActionsComponent } from './chat-message-actions.component';
import { ChatMessageContentComponent } from './chat-message-content.component';
import type {
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';

@Component({
  selector: 'app-ai-chat-message-bubble-assistant',
  host: {
    class: 'contents',
  },
  imports: [CommonModule, ChatMessageActionsComponent, ChatMessageContentComponent],
  template: `
    <div class="flex w-full flex-col gap-2 text-sm">
      <article class="text-base-content">
        <app-ai-chat-message-content [message]="message()" />
      </article>

      <app-ai-chat-message-actions
        [message]="message()"
        [editing]="false"
        (copy)="copy.emit($event)"
        (feedback)="feedback.emit($event)"
        (regenerate)="regenerate.emit($event)"
        (branch)="branch.emit($event)"
      />
    </div>
  `,
})
export class ChatMessageBubbleAssistantComponent {
  readonly message = input.required<IUiChatMessage>();

  readonly copy = output<IUiChatMessageActionEvent>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();
}
