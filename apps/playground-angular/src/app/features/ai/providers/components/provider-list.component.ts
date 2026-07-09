// file: apps/playground-angular/src/app/features/ai/providers/components/provider-list.component.ts

import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiProviderResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';

@Component({
  selector: 'app-ai-provider-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex min-h-0 flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-base-content">Provider List</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Search, add, and select providers.
          </p>
        </div>
        @if (showClose()) {
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
            type="button"
            (click)="close.emit()"
            aria-label="Close provider manager"
          >
            <app-icon iconName="close" size="sm" aria-hidden="true" />
          </button>
        }
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
          placeholder="Search providers"
        />
      </label>

      <div class="flex gap-2">
        <input
          class="min-w-0 flex-1 rounded-2xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="newProviderName()"
          (ngModelChange)="newProviderName.set($event)"
          placeholder="New provider name"
        />
        <button
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-content transition hover:bg-accent/80"
          type="button"
          (click)="create.emit(newProviderName().trim())"
          [disabled]="!newProviderName().trim()"
          aria-label="Add provider"
        >
          <app-icon iconName="add" size="sm" aria-hidden="true" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto pr-1">
        @if (filteredProviders().length === 0) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-sm text-base-content/60">
            No providers found.
          </div>
        } @else {
          <div class="space-y-2">
            @for (provider of filteredProviders(); track provider.id) {
              <button
                class="block w-full rounded-2xl border px-4 py-3 text-left transition"
                [ngClass]="{
                  'border-primary bg-primary/10 text-primary': provider.id === selectedProviderId(),
                  'border-base-300 bg-base-100 text-base-content': provider.id !== selectedProviderId(),
                }"
                type="button"
                (click)="select.emit(provider.id)"
              >
                <div class="text-sm font-semibold">{{ provider.name }}</div>
                <div class="mt-1 text-xs text-base-content/60">
                  {{ provider.kind }} / {{ provider.clientKind }}
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ProviderListComponent {
  readonly providers = input.required<IAiProviderResponseDto[]>();
  readonly selectedProviderId = input<string | null>(null);
  readonly showClose = input(false);

  readonly search = model('');
  readonly newProviderName = model('');

  readonly select = output<string>();
  readonly create = output<string>();
  readonly close = output<void>();

  protected readonly filteredProviders = computed(() => {
    const query = this.search().trim().toLowerCase();
    const providers = this.providers();

    if (!query) {
      return providers;
    }

    return providers.filter((provider) =>
      provider.name.toLowerCase().includes(query)
      || provider.id.toLowerCase().includes(query)
      || provider.kind.toLowerCase().includes(query)
      || provider.clientKind.toLowerCase().includes(query),
    );
  });
}