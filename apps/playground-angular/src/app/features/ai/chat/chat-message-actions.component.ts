import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
  IUiChatMessageFeedbackValue,
} from './chat-message.types';
import { toUiChatContentParts } from './chat-content-parts';
import { IconComponent } from '../../../icons/icon.component';
import { TooltipDirective } from '../../../shared/tooltip';

@Component({
  selector: 'app-ai-chat-message-actions',
  host: {
    class: 'block',
  },
  imports: [CommonModule, IconComponent, TooltipDirective],
  template: `
    @if (shouldRenderActions()) {
      <div
        class="mt-2 flex flex-wrap items-center gap-2"
        [class.justify-end]="message().role === 'user'"
      >
        @if (canCopy()) {
          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="copyMessage()"
            [appTooltip]="copied() ? 'Copied' : 'Copy message'"
            tooltipPosition="bottom"
          >
            <app-icon
              [iconName]="copied() ? 'check' : 'content_copy'"
              size="sm"
              aria-hidden="true"
            />
          </button>
        }

        @if (canEdit()) {
          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="edit.emit({ message: message() })"
            appTooltip="Edit message"
            tooltipPosition="bottom"
          >
            <app-icon iconName="edit" size="sm" aria-hidden="true" />
          </button>
        }

        @if (canFeedback()) {
          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="emitFeedback('good')"
            appTooltip="Mark response helpful"
            tooltipPosition="bottom"
          >
            <app-icon
              iconName="thumb_up"
              size="sm"
              [filled]="feedbackValue() === 'good'"
              aria-hidden="true"
            />
          </button>

          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="emitFeedback('bad')"
            appTooltip="Mark response unhelpful"
            tooltipPosition="bottom"
          >
            <app-icon
              iconName="thumb_down"
              size="sm"
              [filled]="feedbackValue() === 'bad'"
              aria-hidden="true"
            />
          </button>
        }

        @if (canRegenerate()) {
          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="regenerate.emit({ message: message() })"
            appTooltip="Regenerate response"
            tooltipPosition="bottom"
          >
            <app-icon iconName="refresh" size="sm" aria-hidden="true" />
          </button>
        }

        @if (canBranch()) {
          <button
            class="inline-flex items-center justify-center rounded-md p-1 text-neutral transition hover:bg-base-200"
            type="button"
            (click)="branch.emit({ message: message() })"
            appTooltip="Branch from message"
            tooltipPosition="bottom"
          >
            <app-icon iconName="arrow_split" size="sm" aria-hidden="true" />
          </button>
        }
      </div>
    }
  `,
})
export class ChatMessageActionsComponent {
  readonly message = input.required<IUiChatMessage>();

  readonly copy = output<IUiChatMessageActionEvent>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();

  readonly copied = signal(false);
  readonly feedbackValue = computed(() => this.message().feedback ?? null);

  readonly shouldRenderActions = computed(() => {
    if (this.message().actions === false) {
      return false;
    }

    return this.visibleActions().length > 0;
  });
  readonly canCopy = computed(() => this.resolveAction('copy'));
  readonly canEdit = computed(() => this.resolveAction('edit'));
  readonly canFeedback = computed(() => this.resolveAction('feedback'));
  readonly canRegenerate = computed(() => this.resolveAction('regenerate'));
  readonly canBranch = computed(() => this.resolveAction('branch'));
  readonly visibleActions = computed(() => [
    this.canCopy(),
    this.canEdit(),
    this.canFeedback(),
    this.canRegenerate(),
    this.canBranch(),
  ].filter(Boolean));

  async copyMessage(): Promise<void> {
    const text = this.readMessageText();

    if (!text) {
      return;
    }

    try {
      await globalThis.navigator?.clipboard?.writeText(text);
      this.copied.set(true);
      globalThis.setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }

    this.copy.emit({ message: this.message() });
  }

  emitFeedback(value: IUiChatMessageFeedbackValue): void {
    this.feedback.emit({
      message: this.message(),
      value,
    });
  }

  private resolveAction(action: 'copy' | 'edit' | 'feedback' | 'regenerate' | 'branch'): boolean {
    const actions = this.message().actions;

    if (actions === false) {
      return false;
    }

    if (this.message().pending) {
      return false;
    }

    const explicit = actions ? actions[action] : undefined;
    if (explicit !== undefined) {
      return explicit;
    }

    if (this.message().role === 'assistant') {
      return action === 'copy' || action === 'feedback' || action === 'regenerate' || action === 'branch';
    }

    if (this.message().role === 'user') {
      return action === 'copy' || action === 'edit';
    }

    return false;
  }

  private readMessageText(): string {
    return toUiChatContentParts(this.message().content)
      .map((part) => {
        switch (part.kind) {
          case 'text':
          case 'thinking':
            return part.text;
          case 'tool_call':
            return `${part.name}(${JSON.stringify(part.arguments)})`;
          case 'tool_result':
            return typeof part.content === 'string'
              ? part.content
              : JSON.stringify(part.content);
          case 'file':
            return part.filename || part.mediaType;
          case 'image':
            return part.mediaType;
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join('\n\n');
  }
}
