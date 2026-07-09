import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiPromptResponseDto, IAiPromptTypeResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';

@Component({
  selector: 'app-ai-prompt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex min-h-0 flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-base-content">Prompt List</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Search, add, and select prompts.
          </p>
        </div>

        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-content transition hover:bg-accent/80"
          type="button"
          (click)="create.emit()"
          aria-label="Create prompt"
        >
          <app-icon iconName="add" size="sm" aria-hidden="true" />
        </button>
      </div>

      <label class="relative min-w-0">
        <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
          <app-icon iconName="search" size="sm" aria-hidden="true" />
        </span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base-100 px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Search prompts"
        />
      </label>

      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        @if (filteredPrompts().length === 0) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-sm text-base-content/60">
            No prompts found.
          </div>
        } @else {
          @for (promptItem of filteredPrompts(); track promptItem.id) {
            <button
              class="block w-full rounded-2xl border px-4 py-3 text-left transition"
              [ngClass]="{
                'border-primary bg-primary/10 text-primary': promptItem.id === selectedPromptId(),
                'border-base-300 bg-base-100 text-base-content': promptItem.id !== selectedPromptId(),
              }"
              type="button"
              (click)="select.emit(promptItem.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-sm font-semibold">{{ promptItem.name }}</div>
                @if (promptItem.isDefault) {
                  <span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Default</span>
                }
              </div>
              <div class="mt-1 text-xs text-base-content/60">
                {{ formatPromptType(promptItem.type) }}
                @if (promptItem.description) {
                  <span> • {{ promptItem.description | slice:0:40 }}{{ promptItem.description.length > 40 ? '...' : '' }}</span>
                }
              </div>
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class PromptListComponent {
  readonly prompts = input.required<IAiPromptResponseDto[]>();
  readonly promptTypes = input<IAiPromptTypeResponseDto[]>([]);
  readonly selectedPromptId = input<string | null>(null);
  readonly search = model('');

  readonly select = output<string>();
  readonly create = output<void>();

  protected readonly filteredPrompts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const prompts = this.prompts();

    if (!query) {
      return prompts;
    }

    return prompts.filter((item) =>
      item.id.toLowerCase().includes(query)
      || (item.name ?? '').toLowerCase().includes(query)
      || (item.description ?? '').toLowerCase().includes(query)
      || (item.argumentHint ?? '').toLowerCase().includes(query),
    );
  });

  protected formatPromptType(type: string | undefined): string {
    if (!type) {
      return 'Unknown Type';
    }

    const promptType = this.promptTypes().find((item) => item.id === type);
    return promptType?.name ?? type.replaceAll('_', ' ');
  }
}
