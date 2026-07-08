// file: apps\playground-angular\src\app\features\ai\chat\chat-message-bubble.component.ts

import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  IUiChatMessage,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';
import { isUrlData, summarizeToolCallArguments, toUiChatContentParts } from './chat-content-parts';
import { ChatMessageActionsComponent } from './chat-message-actions.component';

@Component({
  selector: 'app-ai-chat-message-bubble',
  host: {
    class: 'contents',
  },
  imports: [CommonModule, ChatMessageActionsComponent],
  template: `
    <div
      class="text-sm flex flex-col gap-2"
      [ngClass]="{
        'ml-auto w-fit max-w-[80%]': message().role === 'user',
        'w-full': message().role === 'assistant',
      }"
    >
      <article
        [ngClass]="{
          'rounded-2xl rounded-br-md bg-base-200 px-4 py-3 text-base-content shadow-sm':
            message().role === 'user',
          'text-base-content': message().role === 'assistant',
        }"
      >
        @if (parts().length === 0) {
          <div class="whitespace-pre-wrap">
            {{ message().pending ? 'Streaming...' : '' }}
          </div>
        } @else {
          <div class="flex flex-col gap-2">
            @for (part of parts(); track $index) {
              @switch (part.kind) {
                @case ('text') {
                  <div class="whitespace-pre-wrap">{{ part.text }}</div>
                }
                @case ('thinking') {
                  <div
                    class="rounded-xl border border-base-300 bg-base-200 px-3 py-2 text-xs italic text-base-content/70"
                  >
                    @if (part.redacted) {
                      <span class="opacity-60">[redacted thinking]</span>
                    } @else {
                      <span
                        class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] not-italic opacity-60"
                      >
                        thinking
                      </span>
                      <span class="whitespace-pre-wrap">{{ part.text }}</span>
                    }
                  </div>
                }
                @case ('tool_call') {
                  <div
                    class="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-content"
                  >
                    <span class="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                      tool call
                    </span>
                    <div class="mt-1 font-mono break-all">
                      {{ part.name }}({{ summarizeArguments(part.arguments) }})
                    </div>
                  </div>
                }
                @case ('tool_result') {
                  <div
                    class="rounded-xl border border-base-300 bg-base-200 px-3 py-2 text-xs text-base-content/80"
                  >
                    <span class="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                      tool result
                    </span>
                    <div class="mt-1 break-all whitespace-pre-wrap">
                      {{ renderToolResult(part.content) }}
                    </div>
                  </div>
                }
                @case ('image') {
                  <div class="text-xs">
                    <span class="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                      image
                    </span>
                    @if (isUrl(part.data)) {
                      <img
                        [src]="part.data.toString()"
                        [alt]="part.mediaType"
                        class="mt-1 max-h-48 rounded-xl"
                      />
                    } @else {
                      <span class="mt-1 block text-base-content/60"
                        >[{{ part.mediaType }} image]</span
                      >
                    }
                  </div>
                }
                @case ('file') {
                  <div class="text-xs">
                    <span class="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                      file
                    </span>
                    @if (isUrl(part.data)) {
                      <a
                        [href]="part.data.toString()"
                        class="mt-1 block break-all underline"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ part.filename || part.mediaType }}
                      </a>
                    } @else {
                      <span class="mt-1 block text-base-content/60">
                        [{{ part.filename || part.mediaType }} file]
                      </span>
                    }
                  </div>
                }
              }
            }
          </div>
        }
      </article>

      <app-ai-chat-message-actions
        [message]="message()"
        (copy)="copy.emit($event)"
        (edit)="edit.emit($event)"
        (feedback)="feedback.emit($event)"
        (regenerate)="regenerate.emit($event)"
        (branch)="branch.emit($event)"
      />
    </div>
  `,
})
export class ChatMessageBubbleComponent {
  readonly message = input.required<IUiChatMessage>();

  readonly copy = output<IUiChatMessageActionEvent>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();

  readonly parts = computed(() => toUiChatContentParts(this.message().content));

  summarizeArguments(args: Record<string, unknown>): string {
    return summarizeToolCallArguments(args);
  }

  isUrl(data: unknown): boolean {
    return isUrlData(data);
  }

  renderToolResult(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
}
