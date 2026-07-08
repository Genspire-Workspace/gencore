import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import type { IAiProviderResponseDto } from '@genspire/sdk-ai';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../icons/icon.component';

@Component({
  selector: 'app-ai-provider-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
      <div class="mb-3">
        <div class="text-sm font-semibold text-base-content">Select Provider</div>
        <div class="mt-1 text-xs text-base-content/60">
          Choose a provider id.
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
          placeholder="Search providers"
        />
      </label>

      <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        @if (filteredProviders().length === 0) {
          <div class="rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
            No providers found.
          </div>
        } @else {
          @for (provider of filteredProviders(); track provider.id) {
            <button
              class="block w-full rounded-2xl border px-4 py-3 text-left transition"
              [class.border-primary]="provider.id === selectedProviderId()"
              [class.bg-base-200]="provider.id === selectedProviderId()"
              [class.border-base-300]="provider.id !== selectedProviderId()"
              [class.bg-base]="provider.id !== selectedProviderId()"
              type="button"
              (click)="select.emit(provider.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-base-content">{{ provider.name }}</div>
                  <div class="mt-1 text-xs text-base-content/60">{{ provider.id }}</div>
                </div>
                <span class="rounded-full bg-base-300 px-2.5 py-1 text-[11px] font-medium text-base-content/65">
                  {{ provider.clientKind }}
                </span>
              </div>
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class ProviderDropdownComponent {
  readonly providers = input.required<IAiProviderResponseDto[]>();
  readonly selectedProviderId = input<string>('');
  readonly select = output<string>();

  readonly search = model('');

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
