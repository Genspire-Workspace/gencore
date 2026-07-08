import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiModelResponseDto, IAiProviderResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';

@Component({
  selector: 'app-ai-provider-model-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
      <div class="mb-3">
        <div class="text-sm font-semibold text-base-content">Select Model</div>
        <div class="mt-1 text-xs text-base-content/60">
          @if (provider()) {
            Models available under {{ provider()!.name }}.
          } @else {
            Select a provider first.
          }
        </div>
      </div>

      <label class="relative block">
        <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
          <app-icon iconName="search" size="sm" aria-hidden="true" />
        </span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Search models"
        />
      </label>

      <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        @if (!provider()) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
            Pick a provider to list its models.
          </div>
        } @else if (filteredModels().length === 0) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
            No models found for this provider.
          </div>
        } @else {
          @for (model of filteredModels(); track model.id) {
            <button
              class="block w-full rounded-2xl border px-4 py-3 text-left transition"
              [class.border-primary]="model.name === selectedModelName()"
              [class.bg-base-200]="model.name === selectedModelName()"
              [class.border-base-300]="model.name !== selectedModelName()"
              [class.bg-base]="model.name !== selectedModelName()"
              type="button"
              (click)="select.emit(model.name)"
            >
              <div class="text-sm font-semibold text-base-content">{{ model.name }}</div>
              <div class="mt-1 text-xs text-base-content/60">
                {{ model.family || 'No family' }}
              </div>
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class ProviderModelDropdownComponent {
  readonly provider = input<IAiProviderResponseDto | null>(null);
  readonly models = input.required<IAiModelResponseDto[]>();
  readonly selectedModelName = input('');
  readonly select = output<string>();

  readonly search = model('');

  protected readonly filteredModels = computed(() => {
    const query = this.search().trim().toLowerCase();
    const models = this.models();

    if (!query) {
      return models;
    }

    return models.filter((model) =>
      model.name.toLowerCase().includes(query)
      || (model.family || '').toLowerCase().includes(query),
    );
  });
}
