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

@Component({
  selector: 'app-ai-chat-message-actions',
  host: {
    class: 'block',
  },
  imports: [CommonModule, IconComponent],
  template: `
    @if (visibleActions().length > 0) {
      <div
        class="mt-2 flex flex-wrap items-center gap-2"
        [class.justify-end]="message().role === 'user'"
      >
        @if (canCopy()) {
          <button
            class="inline-flex items-center gap-1 rounded-full border border-base-300 px-3 py-1 text-[11px] font-medium text-base-content/70 transition hover:border-base-content/30 hover:bg-base-200 hover:text-base-content"
            type="button"
            (click)="copyMessage()"
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
            class="inline-flex items-center gap-1 rounded-full border border-base-300 px-3 py-1 text-[11px] font-medium text-base-content/70 transition hover:border-base-content/30 hover:bg-base-200 hover:text-base-content"
            type="button"
            (click)="edit.emit({ message: message() })"
          >
            <app-icon iconName="edit" size="sm" aria-hidden="true" />
          </button>
        }

        @if (canFeedback()) {
          <button
            class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition"
            type="button"
            [ngClass]="{
              'border-success bg-success/10 text-success': feedbackValue() === 'good',
              'border-base-300 text-base-content/70': feedbackValue() !== 'good',
            }"
            (click)="emitFeedback('good')"
          >
            <app-icon iconName="thumb_up" size="sm" aria-hidden="true" />
          </button>

          <button
            class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition"
            type="button"
            [ngClass]="{
              'border-danger bg-danger/10 text-danger': feedbackValue() === 'bad',
              'border-base-300 text-base-content/70': feedbackValue() !== 'bad',
            }"
            (click)="emitFeedback('bad')"
          >
            <app-icon iconName="thumb_down" size="sm" aria-hidden="true" />
          </button>
        }

        @if (canRegenerate()) {
          <button
            class="inline-flex items-center gap-1 rounded-full border border-base-300 px-3 py-1 text-[11px] font-medium text-base-content/70 transition hover:border-base-content/30 hover:bg-base-200 hover:text-base-content"
            type="button"
            (click)="regenerate.emit({ message: message() })"
          >
            <app-icon iconName="refresh" size="sm" aria-hidden="true" />
          </button>
        }

        @if (canBranch()) {
          <button
            class="inline-flex items-center gap-1 rounded-full border border-base-300 px-3 py-1 text-[11px] font-medium text-base-content/70 transition hover:border-base-content/30 hover:bg-base-200 hover:text-base-content"
            type="button"
            (click)="branch.emit({ message: message() })"
          >
            <app-icon iconName="account_tree" size="sm" aria-hidden="true" />
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
    if (this.message().pending) {
      return false;
    }

    const explicit = this.message().actions?.[action];
    if (explicit !== undefined) {
      return explicit;
    }

    if (this.message().role === 'assistant') {
      return action === 'copy' || action === 'feedback' || action === 'regenerate' || action === 'branch';
    }

    if (this.message().role === 'user') {
      return action === 'copy' || action === 'edit' || action === 'branch';
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
