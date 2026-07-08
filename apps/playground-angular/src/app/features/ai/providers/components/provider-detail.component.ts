// file: apps/playground-angular/src/app/features/ai/providers/components/provider-detail.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiProviderResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';
import { OverlayService } from '../../../../shared/overlay';
import type { AppOverlayHandle } from '../../../../shared/overlay';

export interface IProviderDraft {
  name: string;
  kind: string;
  clientKind: string;
  baseUrl: string;
  api: string;
  doc: string;
  website: string;
}

@Component({
  selector: 'app-ai-provider-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (provider()) {
      <div class="space-y-8">
        <div>
          <h3 class="text-lg font-semibold text-base-content">{{ name() || 'Provider' }}</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Configure endpoint, metadata, models, and API keys.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Name</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Kind</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="kind()"
              (ngModelChange)="kind.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Client Kind</span>
            @if (clientKinds().length > 0) {
              <div class="flex gap-2">
                <input
                  class="min-w-0 flex-1 rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
                  type="text"
                  [ngModel]="clientKind()"
                  (ngModelChange)="clientKind.set($event)"
                  placeholder="Client kind"
                />
                <button
                  #clientKindTrigger
                  class="inline-flex h-[3.125rem] w-[3.125rem] shrink-0 items-center justify-center rounded-2xl border border-base-300 bg-base text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
                  type="button"
                  (click)="openClientKindDropdown(clientKindTrigger)"
                  aria-label="Select client kind"
                >
                  <app-icon iconName="arrow_drop_down" size="md" aria-hidden="true" />
                </button>
              </div>
            } @else {
              <input
                class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
                type="text"
                [ngModel]="clientKind()"
                (ngModelChange)="clientKind.set($event)"
              />
            }
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Endpoint</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="baseUrl()"
              (ngModelChange)="baseUrl.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">API</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="api()"
              (ngModelChange)="api.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Documentation</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="doc()"
              (ngModelChange)="doc.set($event)"
            />
          </label>

          <label class="block space-y-2 md:col-span-2">
            <span class="text-sm font-medium text-base-content/80">Website</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="website()"
              (ngModelChange)="website.set($event)"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            @if (confirmDelete()) {
              <span class="text-sm text-danger">Delete this provider and all its models?</span>
              <button
                class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
                type="button"
                (click)="confirmDelete.set(false)"
              >
                Cancel
              </button>
              <button
                class="rounded-2xl bg-danger px-4 py-2.5 text-sm font-medium text-danger-content transition hover:bg-danger/85"
                type="button"
                (click)="delete.emit()"
              >
                Confirm Delete
              </button>
            } @else {
              <button
                class="inline-flex items-center gap-2 rounded-2xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
                type="button"
                (click)="confirmDelete.set(true)"
              >
                <app-icon iconName="delete" size="sm" aria-hidden="true" />
                Delete Provider
              </button>
            }
          </div>

          <button
            class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
            type="button"
            (click)="save.emit()"
          >
            Save Provider
          </button>
        </div>
      </div>
    } @else {
      <div class="flex h-full items-center justify-center rounded-3xl border border-dashed border-base-300 p-8 text-center text-base-content/60">
        Select or create a provider to edit its settings and models.
      </div>
    }

    <ng-template #clientKindDropdown let-overlay>
      <div class="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
        <div class="mb-3">
          <div class="text-sm font-semibold text-base-content">Select Client Kind</div>
          <div class="mt-1 text-xs text-base-content/60">
            Choose the transport/client compatibility for this provider.
          </div>
        </div>

        <label class="relative block">
          <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
            <app-icon iconName="search" size="sm" aria-hidden="true" />
          </span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
            type="search"
            [ngModel]="clientKindSearch()"
            (ngModelChange)="clientKindSearch.set($event)"
            placeholder="Search client kinds"
          />
        </label>

        <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          @if (filteredClientKinds().length === 0) {
            <div class="rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/60">
              No client kinds found.
            </div>
          } @else {
            @for (clientKindOption of filteredClientKinds(); track clientKindOption) {
              <button
                class="block w-full rounded-2xl border px-4 py-3 text-left transition"
                [class.border-primary]="clientKindOption === clientKind()"
                [class.bg-base-200]="clientKindOption === clientKind()"
                [class.border-base-300]="clientKindOption !== clientKind()"
                [class.bg-base]="clientKindOption !== clientKind()"
                type="button"
                (click)="selectClientKind(clientKindOption, overlay)"
              >
                <div class="text-sm font-semibold text-base-content">{{ clientKindOption }}</div>
              </button>
            }
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class ProviderDetailComponent {
  readonly provider = input<IAiProviderResponseDto | null>(null);
  readonly clientKinds = input<string[]>([]);

  @ViewChild('clientKindDropdown', { static: true })
  private readonly clientKindDropdownTemplate!: TemplateRef<unknown>;

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly name = model('');
  readonly kind = model('');
  readonly clientKind = model('');
  readonly baseUrl = model('');
  readonly api = model('');
  readonly doc = model('');
  readonly website = model('');

  readonly save = output<void>();
  readonly delete = output<void>();

  protected readonly confirmDelete = signal(false);
  protected readonly clientKindSearch = signal('');
  protected readonly filteredClientKinds = computed(() => {
    const query = this.clientKindSearch().trim().toLowerCase();
    const clientKinds = this.clientKinds();

    if (!query) {
      return clientKinds;
    }

    return clientKinds.filter((item) => item.toLowerCase().includes(query));
  });

  private activeDropdownHandle: AppOverlayHandle | null = null;

  hydrate(provider: IAiProviderResponseDto): void {
    this.name.set(provider.name);
    this.kind.set(provider.kind);
    this.clientKind.set(provider.clientKind);
    this.baseUrl.set(provider.baseUrl || '');
    this.api.set(provider.api || '');
    this.doc.set(provider.doc || '');
    this.website.set(provider.website || '');
    this.clientKindSearch.set('');
  }

  read(): IProviderDraft {
    return {
      name: this.name().trim(),
      kind: this.kind().trim(),
      clientKind: this.clientKind().trim(),
      baseUrl: this.baseUrl().trim(),
      api: this.api().trim(),
      doc: this.doc().trim(),
      website: this.website().trim(),
    };
  }

  protected openClientKindDropdown(origin: HTMLElement): void {
    this.activeDropdownHandle?.close();
    this.clientKindSearch.set('');

    const handle = this.overlayService.createDropdownTemplate(
      {
        templateRef: this.clientKindDropdownTemplate,
        viewContainerRef: this.viewContainerRef,
      },
      {
        origin,
        hasBackdrop: true,
        minWidth: '16rem',
        panelClass: 'app-provider-client-kind-dropdown-overlay',
      },
    );

    this.activeDropdownHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeDropdownHandle?.id === handle.id) {
        this.activeDropdownHandle = null;
      }
    });
  }

  protected selectClientKind(clientKind: string, overlay: AppOverlayHandle): void {
    this.clientKind.set(clientKind);
    overlay.close();
  }
}
