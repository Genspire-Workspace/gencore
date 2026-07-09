import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { isUrlData, summarizeToolCallArguments, toUiChatContentParts } from './chat-content-parts';
import type { IUiChatMessage } from './chat-message.types';

@Component({
  selector: 'app-ai-chat-message-content',
  imports: [CommonModule],
  template: `
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
                  <span class="mt-1 block text-base-content/60">[{{ part.mediaType }} image]</span>
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
  `,
})
export class ChatMessageContentComponent {
  readonly message = input.required<IUiChatMessage>();

  protected readonly parts = computed(() => toUiChatContentParts(this.message().content));

  protected summarizeArguments(args: Record<string, unknown>): string {
    return summarizeToolCallArguments(args);
  }

  protected isUrl(data: unknown): boolean {
    return isUrlData(data);
  }

  protected renderToolResult(content: unknown): string {
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
