import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../../icons/icon.component';
import type {
  IChatComposerTokenSuggestion,
  IChatComposerTokenSuggestionSection,
} from './chat-composer.base';

@Component({
  selector: 'app-ai-chat-composer-token-menu',
  imports: [CommonModule, IconComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="w-full rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
      <div class="max-h-80 space-y-3 overflow-y-auto">
        @for (section of sections(); track section.kind) {
          <section class="rounded-2xl border border-base-300/70 bg-base px-2 py-2">
            <div class="flex items-center gap-2 px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
              <app-icon [iconName]="section.iconName" size="sm" aria-hidden="true" />
              <span>{{ section.label }}</span>
            </div>

            @if (section.options.length > 0) {
              <div class="space-y-1">
                @for (option of section.options; track option.id) {
                  <button
                    class="block w-full rounded-2xl px-3 py-3 text-left transition"
                    [class.bg-primary/10]="option.id === highlightedOptionId()"
                    [class.text-primary]="option.id === highlightedOptionId()"
                    [class.bg-base-100]="option.id !== highlightedOptionId()"
                    [class.text-base-content]="option.id !== highlightedOptionId()"
                    type="button"
                    (mouseenter)="highlight.emit(option.id)"
                    (click)="select.emit(option)"
                  >
                    <div class="flex items-center gap-2">
                      <app-icon [iconName]="option.iconName" size="sm" aria-hidden="true" />
                      <span class="text-sm font-semibold">{{ option.label }}</span>
                    </div>
                    <div class="mt-1 text-xs text-base-content/60">{{ option.description }}</div>
                  </button>
                }
              </div>
            } @else {
              <div class="px-3 py-3 text-xs text-base-content/45">
                No {{ section.label.toLowerCase() }} available yet.
              </div>
            }
          </section>
        }
      </div>
    </div>
  `,
})
export class ChatComposerTokenMenuComponent {
  readonly sections = input.required<readonly IChatComposerTokenSuggestionSection[]>();
  readonly highlightedOptionId = input<string | null>(null);

  readonly highlight = output<string>();
  readonly select = output<IChatComposerTokenSuggestion>();
}
