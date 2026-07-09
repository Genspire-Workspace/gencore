import { CommonModule } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { ChatComposerEditMessageComponent } from './chat-composer-edit-message.component';
import { ChatMessageActionsComponent } from './chat-message-actions.component';
import { ChatMessageContentComponent } from './chat-message-content.component';
import type {
  IChatComposerAttachment,
  IUiChatMessage,
  IUiChatMessageActionEvent,
} from './chat-message.types';

@Component({
  selector: 'app-ai-chat-message-bubble-user',
  host: {
    class: 'contents',
  },
  imports: [
    CommonModule,
    ChatComposerEditMessageComponent,
    ChatMessageActionsComponent,
    ChatMessageContentComponent,
  ],
  template: `
    <div
      class="flex flex-col gap-2 text-sm"
      [class.ml-auto]="!editing()"
      [class.w-fit]="!editing()"
      [class.max-w-[80%]]="!editing()"
      [class.w-full]="editing()"
    >
      @if (editing()) {
        <app-ai-chat-composer-edit-message
          [(prompt)]="prompt"
          [(attachments)]="attachments"
          [sending]="sending()"
          [state]="sending() ? 'generating' : 'editing'"
          [minRows]="2"
          [maxRows]="8"
          (submit)="submit.emit()"
          (cancel)="cancel.emit()"
          (cancelEdit)="cancelEdit.emit()"
        />
      } @else {
        <article class="rounded-2xl rounded-br-md bg-base-200 px-4 py-3 text-base-content shadow-sm">
          <app-ai-chat-message-content [message]="message()" />
        </article>

        <app-ai-chat-message-actions
          [message]="message()"
          [editing]="false"
          (copy)="copy.emit($event)"
          (edit)="edit.emit($event)"
        />
      }
    </div>
  `,
})
export class ChatMessageBubbleUserComponent {
  readonly message = input.required<IUiChatMessage>();
  readonly editing = input(false);
  readonly sending = input(false);

  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);

  readonly copy = output<IUiChatMessageActionEvent>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly submit = output<void>();
  readonly cancel = output<void>();
  readonly cancelEdit = output<void>();
}
