import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { IAiModelResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../icons/icon.component';

interface IModelFamilyGroup {
  key: string;
  label: string;
  models: IAiModelResponseDto[];
}

@Component({
  selector: 'app-ai-provider-model-list',
  imports: [CommonModule, IconComponent],
  template: `
    <div class="space-y-3">
      @if (models().length === 0) {
        <div class="rounded-2xl border border-dashed border-base-300 px-4 py-4 text-sm text-base-content/60">
          No models yet.
        </div>
      } @else {
        @for (group of familyGroups(); track group.key) {
          <section class="space-y-2">
            <div class="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
              {{ group.label }}
            </div>

            @for (model of group.models; track model.id) {
              <button
                class="block w-full rounded-2xl border px-4 py-3 text-left transition"
                [class.border-primary]="model.id === selectedModelId()"
                [class.bg-base-200]="model.id === selectedModelId()"
                [class.border-base-300]="model.id !== selectedModelId()"
                [class.bg-base]="model.id !== selectedModelId()"
                type="button"
                (click)="select.emit(model.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-base-content">{{ model.name }}</div>
                    <div class="mt-1 text-xs text-base-content/60">{{ describeKinds(model) }}</div>
                  </div>

                  <button
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-error/70 transition hover:bg-error/10 hover:text-error"
                    type="button"
                    (click)="delete.emit(model.id); $event.stopPropagation()"
                    aria-label="Delete model"
                  >
                    <app-icon iconName="delete" size="sm" aria-hidden="true" />
                  </button>
                </div>
              </button>
            }
          </section>
        }
      }
    </div>
  `,
})
export class ProviderModelListComponent {
  readonly models = input.required<IAiModelResponseDto[]>();
  readonly selectedModelId = input<string | null>(null);
  readonly select = output<string>();
  readonly delete = output<string>();

  protected readonly familyGroups = computed<IModelFamilyGroup[]>(() => {
    const groups = new Map<string, IModelFamilyGroup>();

    for (const model of this.models()) {
      const family = model.family?.trim() || '';
      const key = family.toLowerCase() || '__uncategorized__';
      const label = family || 'Uncategorized';
      const group = groups.get(key) ?? { key, label, models: [] };
      group.models.push(model);
      groups.set(key, group);
    }

    return [...groups.values()].sort((left, right) => {
      if (left.key === '__uncategorized__') return 1;
      if (right.key === '__uncategorized__') return -1;
      return left.label.localeCompare(right.label);
    });
  });

  protected describeKinds(model: IAiModelResponseDto): string {
    const capabilities = model.capabilities;
    if (!capabilities || typeof capabilities !== 'object') {
      return model.family || 'No capability details';
    }

    const inputKinds = this.readStringArray(capabilities['inputKinds']);
    const outputKinds = this.readStringArray(capabilities['outputKinds']);

    if (inputKinds.length === 0 && outputKinds.length === 0) {
      return model.family || 'No capability details';
    }

    return `In: ${inputKinds.join(', ') || '-'} • Out: ${outputKinds.join(', ') || '-'}`;
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
}
