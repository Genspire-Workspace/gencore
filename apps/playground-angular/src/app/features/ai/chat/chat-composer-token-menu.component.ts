import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { IChatComposerTokenSuggestion } from './chat-composer.base';

@Component({
  selector: 'app-ai-chat-composer-token-menu',
  imports: [CommonModule],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="w-full rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
      <div class="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
        {{ title() }}
      </div>

      <div class="max-h-72 space-y-1 overflow-y-auto">
        @for (option of options(); track option.id; let index = $index) {
          <button
            class="block w-full rounded-2xl px-3 py-3 text-left transition"
            [class.bg-primary/10]="index === highlightedIndex()"
            [class.text-primary]="index === highlightedIndex()"
            [class.bg-base-100]="index !== highlightedIndex()"
            [class.text-base-content]="index !== highlightedIndex()"
            type="button"
            (mouseenter)="highlight.emit(index)"
            (click)="select.emit(option)"
          >
            <div class="text-sm font-semibold">{{ option.label }}</div>
            <div class="mt-1 text-xs text-base-content/60">{{ option.description }}</div>
          </button>
        }
      </div>
    </div>
  `,
})
export class ChatComposerTokenMenuComponent {
  readonly title = input('');
  readonly options = input.required<readonly IChatComposerTokenSuggestion[]>();
  readonly highlightedIndex = input(0);

  readonly highlight = output<number>();
  readonly select = output<IChatComposerTokenSuggestion>();
}
