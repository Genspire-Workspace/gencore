// file: apps/playground-angular/src/app/features/ai/sessions/components/session-config-form.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiModelResponseDto, IAiProviderResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';
import { OverlayService } from '../../../../shared/overlay';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { AiProviderClient } from '../../providers/ai-provider.client';
import {
  ProviderModelPathDropdownComponent,
  type IAiProviderModelPathOption,
} from '../../providers/components/provider-model-path-dropdown.component';
import type {
  IAiSessionConfigDraft,
  IAiSessionResponse,
  IAiSessionSettings,
} from '../ai-session-types';

const MAX_TOKEN_OPTIONS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072] as const;

@Component({
  selector: 'app-ai-session-config-form',
  host: {
    class: 'block h-full min-h-0',
  },
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ProviderModelPathDropdownComponent,
  ],
  template: `
    <div class="flex h-full min-h-0 flex-col">
      <div class="flex-1 space-y-5 overflow-y-auto pr-1">
      <div>
        <h3 class="text-lg font-semibold text-base-content">Session Settings</h3>
        <p class="mt-1 text-sm text-base-content/60">
          Edit session metadata and generation defaults.
        </p>
      </div>

      <div class="space-y-4">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">Title</span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="title()"
            (ngModelChange)="title.set($event)"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">AI Model</span>
          <div class="flex gap-2">
            <input
              class="min-w-0 flex-1 rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="selectedModelPath()"
              (ngModelChange)="updateModelPathValue($event)"
              placeholder="provider:model"
            />
            <button
              #modelPathTrigger
              class="inline-flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded-2xl border border-base-300 bg-base text-base-content/70 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              (click)="openModelPathDropdown(modelPathTrigger)"
              [disabled]="modelPathOptions().length === 0"
              aria-label="Select provider:model path"
            >
              <app-icon iconName="travel_explore" size="sm" aria-hidden="true" />
            </button>
          </div>
          <p class="text-xs text-base-content/55">
            Quick selector across every available provider and model.
          </p>
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">System Prompt</span>
          <textarea
            class="min-h-28 w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            [ngModel]="systemPrompt()"
            (ngModelChange)="systemPrompt.set($event)"
          ></textarea>
        </label>

        <div class="space-y-4">
          <label class="block space-y-2">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-medium text-base-content/80">Temperature</span>
              <span class="min-w-16 text-right text-sm font-medium text-base-content/70">
                {{ temperatureDisplay() }}
              </span>
            </div>
            <input
              class="range range-primary w-full"
              type="range"
              min="0"
              max="2"
              step="0.1"
              [ngModel]="temperatureSliderValue()"
              (ngModelChange)="setTemperatureFromSlider($event)"
            />
          </label>

          <label class="block space-y-2">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-medium text-base-content/80">Top P</span>
              <span class="min-w-16 text-right text-sm font-medium text-base-content/70">
                {{ topPDisplay() }}
              </span>
            </div>
            <input
              class="range range-primary w-full"
              type="range"
              min="0"
              max="1"
              step="0.05"
              [ngModel]="topPSliderValue()"
              (ngModelChange)="setTopPFromSlider($event)"
            />
          </label>

          <label class="block space-y-2">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-medium text-base-content/80">Max Tokens</span>
              <span class="min-w-20 text-right text-sm font-medium text-base-content/70">
                {{ maxTokensDisplay() }}
              </span>
            </div>
            <input
              class="range range-primary w-full"
              type="range"
              min="0"
              [max]="maxTokenSliderMax"
              step="1"
              [ngModel]="maxTokenSliderValue()"
              (ngModelChange)="setMaxTokensFromSlider($event)"
            />
          </label>
        </div>
      </div>

      </div>

      <div class="mt-5 flex items-center justify-end gap-3 border-t border-base-300 pt-4">
        <button
          class="mr-auto rounded-2xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
          type="button"
          (click)="openDeleteModal()"
        >
          Delete
        </button>

        <button
          class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
          type="button"
          (click)="cancel.emit()"
        >
          Close
        </button>

        <button
          class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
          type="button"
          (click)="save.emit(readDraft())"
        >
          Save
        </button>
      </div>
    </div>

    <ng-template #modelPathDropdown let-overlay>
      <app-ai-provider-model-path-dropdown
        [options]="modelPathOptions()"
        [selectedPath]="selectedModelPath()"
        (select)="selectModelPathFromDropdown($event, overlay)"
      />
    </ng-template>

    <ng-template #deleteModal let-overlay>
      <div class="w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-base-content">Delete Session</h3>
        <p class="mt-2 text-sm text-base-content/60">
          Delete
          <span class="font-medium text-base-content">{{ title() || 'this session' }}</span>?
          This action cannot be undone.
        </p>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-2xl bg-danger px-4 py-2.5 text-sm font-medium text-danger-content transition hover:bg-danger/80"
            type="button"
            (click)="confirmDelete(overlay)"
          >
            Confirm
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class SessionConfigFormComponent {
  readonly session = input.required<IAiSessionResponse>();

  readonly save = output<IAiSessionConfigDraft>();
  readonly cancel = output<void>();
  readonly delete = output<string>();

  @ViewChild('modelPathDropdown', { static: true })
  private readonly modelPathDropdownTemplate!: TemplateRef<unknown>;

  @ViewChild('deleteModal', { static: true })
  private readonly deleteModalTemplate!: TemplateRef<unknown>;

  private readonly providerClient = inject(AiProviderClient);
  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly title = model('');
  readonly provider = model('');
  readonly model = model('');
  readonly systemPrompt = model('');
  readonly temperature = model('');
  readonly topP = model('');
  readonly maxTokens = model('');

  protected readonly maxTokenSliderMax = MAX_TOKEN_OPTIONS.length - 1;

  protected readonly providers = signal<IAiProviderResponseDto[]>([]);
  protected readonly modelsByProvider = signal<Record<string, IAiModelResponseDto[]>>({});

  protected readonly modelPathOptions = computed<IAiProviderModelPathOption[]>(() =>
    this.providers().flatMap((provider) =>
      (this.modelsByProvider()[provider.id] ?? []).map((model) => ({
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        label: `${provider.id}:${model.name}`,
        family: model.family || undefined,
      })),
    ),
  );

  protected readonly selectedModelPath = computed(() => {
    const providerId = this.provider().trim();
    const modelName = this.model().trim();

    if (!providerId || !modelName) {
      return '';
    }

    return `${providerId}:${modelName}`;
  });

  protected readonly temperatureSliderValue = computed(() => this.readClampedNumber(this.temperature(), 0, 2, 1));
  protected readonly topPSliderValue = computed(() => this.readClampedNumber(this.topP(), 0, 1, 1));
  protected readonly maxTokenSliderValue = computed(() => this.resolveMaxTokenIndex(this.maxTokens()));
  protected readonly temperatureDisplay = computed(() => this.temperatureSliderValue().toFixed(1));
  protected readonly topPDisplay = computed(() => this.topPSliderValue().toFixed(2));
  protected readonly maxTokensDisplay = computed(() =>
    new Intl.NumberFormat('en-US').format(MAX_TOKEN_OPTIONS[this.maxTokenSliderValue()]),
  );

  private activeDropdownHandle: AppOverlayHandle | null = null;
  private activeModalHandle: AppOverlayHandle | null = null;

  constructor() {
    effect(() => {
      const session = this.session();
      const settings = this.readSettings(session);

      this.title.set(session.title || '');
      this.provider.set(settings.provider || '');
      this.model.set(settings.model || '');
      this.systemPrompt.set(settings.systemPrompt || '');
      this.temperature.set(settings.temperature?.toString() || '');
      this.topP.set(settings.topP?.toString() || '');
      this.maxTokens.set(settings.maxTokens?.toString() || '');

      if (settings.provider) {
        void this.ensureProviderModels(settings.provider);
      }

      this.activeModalHandle?.close();
    });

    void this.loadProviderCatalogue();
  }

  protected readDraft(): IAiSessionConfigDraft {
    return {
      title: this.title(),
      provider: this.provider(),
      model: this.model(),
      systemPrompt: this.systemPrompt(),
      temperature: this.temperature(),
      topP: this.topP(),
      maxTokens: this.maxTokens(),
    };
  }

  protected openModelPathDropdown(origin: HTMLElement): void {
    this.openDropdown(this.modelPathDropdownTemplate, origin, '18rem');
  }

  protected updateModelPathValue(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) {
      this.provider.set('');
      this.model.set('');
      return;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex < 0) {
      this.provider.set(trimmed);
      this.model.set('');
      return;
    }

    const providerId = trimmed.slice(0, separatorIndex).trim();
    const modelName = trimmed.slice(separatorIndex + 1).trim();
    this.provider.set(providerId);
    this.model.set(modelName);

    if (providerId) {
      void this.ensureProviderModels(providerId);
    }
  }

  protected async selectModelPathFromDropdown(
    option: IAiProviderModelPathOption,
    overlay: AppOverlayHandle,
  ): Promise<void> {
    this.provider.set(option.providerId);
    await this.ensureProviderModels(option.providerId);
    this.model.set(option.modelName);
    overlay.close();
  }

  protected openDeleteModal(): void {
    this.activeModalHandle?.close();

    const handle = this.overlayService.createModalTemplate(
      {
        templateRef: this.deleteModalTemplate,
        viewContainerRef: this.viewContainerRef,
      },
      {
        panelClass: 'app-session-delete-modal-overlay',
        width: 'auto',
      },
    );

    this.activeModalHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeModalHandle?.id === handle.id) {
        this.activeModalHandle = null;
      }
    });
  }

  protected confirmDelete(overlay: AppOverlayHandle): void {
    this.delete.emit(this.session().id);
    overlay.close();
  }

  protected setTemperatureFromSlider(value: string | number): void {
    this.temperature.set(this.normalizeDecimalSliderValue(value, 1));
  }

  protected setTopPFromSlider(value: string | number): void {
    this.topP.set(this.normalizeDecimalSliderValue(value, 2));
  }

  protected setMaxTokensFromSlider(value: string | number): void {
    const index = this.readClampedInteger(value, 0, this.maxTokenSliderMax);
    this.maxTokens.set(String(MAX_TOKEN_OPTIONS[index]));
  }

  private async loadProviderCatalogue(): Promise<void> {
    const providers = await this.providerClient.listProviders();
    this.providers.set(providers);

    const providerIds = providers.map((provider) => provider.id);
    await Promise.all(providerIds.map((providerId) => this.ensureProviderModels(providerId)));
  }

  private async ensureProviderModels(providerId: string): Promise<void> {
    const normalizedProviderId = providerId.trim();
    if (!normalizedProviderId) {
      return;
    }

    if (this.modelsByProvider()[normalizedProviderId]) {
      return;
    }

    const models = await this.providerClient.listModels(normalizedProviderId);
    this.modelsByProvider.update((current) => ({
      ...current,
      [normalizedProviderId]: models,
    }));
  }

  private openDropdown(
    templateRef: TemplateRef<unknown>,
    origin: HTMLElement,
    minWidth = '16rem',
  ): void {
    this.activeDropdownHandle?.close();

    const handle = this.overlayService.createDropdownTemplate(
      {
        templateRef,
        viewContainerRef: this.viewContainerRef,
      },
      {
        origin,
        hasBackdrop: true,
        minWidth,
        panelClass: 'app-session-config-dropdown-overlay',
      },
    );

    this.activeDropdownHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeDropdownHandle?.id === handle.id) {
        this.activeDropdownHandle = null;
      }
    });
  }

  private readClampedNumber(value: string | number, min: number, max: number, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
  }

  private readClampedInteger(value: string | number, min: number, max: number): number {
    const parsed = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(parsed)) {
      return min;
    }

    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  private normalizeDecimalSliderValue(value: string | number, digits: number): string {
    const parsed = typeof value === 'number' ? value : Number(value.trim());
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    return safeValue.toFixed(digits);
  }

  private resolveMaxTokenIndex(value: string | number): number {
    const parsed = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < MAX_TOKEN_OPTIONS.length; index += 1) {
      const distance = Math.abs(MAX_TOKEN_OPTIONS[index] - parsed);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    return closestIndex;
  }

  private readSettings(session: IAiSessionResponse): IAiSessionSettings {
    const settings = session.settings;
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return {
      provider: typeof settings['provider'] === 'string' ? settings['provider'] : undefined,
      model: typeof settings['model'] === 'string' ? settings['model'] : undefined,
      systemPrompt: typeof settings['systemPrompt'] === 'string' ? settings['systemPrompt'] : undefined,
      temperature: typeof settings['temperature'] === 'number' ? settings['temperature'] : undefined,
      topP: typeof settings['topP'] === 'number' ? settings['topP'] : undefined,
      maxTokens: typeof settings['maxTokens'] === 'number' ? settings['maxTokens'] : undefined,
    };
  }
}
