import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../icons/icon.component';

export interface IAiProviderModelPathOption {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  label: string;
  family?: string;
}

@Component({
  selector: 'app-ai-provider-model-path-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
      <label class="relative block">
        <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
          <app-icon iconName="search" size="sm" aria-hidden="true" />
        </span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Search provider:model"
        />
      </label>

      <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        @if (filteredOptions().length === 0) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
            No provider:model paths found.
          </div>
        } @else {
          @for (option of filteredOptions(); track option.modelId) {
            <button
              class="block w-full rounded-2xl border px-4 py-3 text-left transition"
              [class.border-primary]="option.label === selectedPath()"
              [class.bg-base-200]="option.label === selectedPath()"
              [class.border-base-300]="option.label !== selectedPath()"
              [class.bg-base]="option.label !== selectedPath()"
              type="button"
              (click)="select.emit(option)"
            >
              <div class="text-sm font-semibold text-base-content">{{ option.label }}</div>
              <div class="mt-1 text-xs text-base-content/60">
                {{ option.providerName }}
                @if (option.family) {
                  <span> • {{ option.family }}</span>
                }
              </div>
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class ProviderModelPathDropdownComponent {
  readonly options = input.required<IAiProviderModelPathOption[]>();
  readonly selectedPath = input('');
  readonly select = output<IAiProviderModelPathOption>();

  readonly search = model('');

  protected readonly filteredOptions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const options = this.options();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
      || option.providerName.toLowerCase().includes(query)
      || (option.family || '').toLowerCase().includes(query),
    );
  });
}
