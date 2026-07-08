// file: apps/playground-angular/src/app/features/ai/providers/components/provider-model-editor.component.ts

import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiModelResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';
import { TooltipDirective } from '../../../../shared/tooltip';
import { ProviderModelListComponent } from '../provider-model-list.component';

export interface IModelDraft {
  name: string;
  family: string;
  inputKinds: string[];
  outputKinds: string[];
}

interface IAiModelCapabilitiesDraft {
  chat?: boolean;
  streaming?: boolean;
  embeddings?: boolean;
  vision?: boolean;
  functionCalling?: boolean;
  inputKinds?: string[];
  outputKinds?: string[];
}

const COMMON_MODEL_INPUT_KINDS = ['text', 'image', 'audio', 'file', 'video'] as const;
const COMMON_MODEL_OUTPUT_KINDS = ['text', 'image', 'embedding', 'audio', 'file', 'video'] as const;
const DISABLED_OUTPUT_KINDS = new Set(['tool-call']);

const KIND_META: Record<string, { icon: string; tooltip: string }> = {
  text: { icon: 'text_fields', tooltip: 'Text modality' },
  image: { icon: 'image', tooltip: 'Image modality' },
  audio: { icon: 'mic', tooltip: 'Audio modality' },
  video: { icon: 'movie', tooltip: 'Video modality' },
  file: { icon: 'description', tooltip: 'File modality' },
  embedding: { icon: 'polyline', tooltip: 'Embedding vector output' },
  json: { icon: 'data_object', tooltip: 'Structured JSON output' },
};

@Component({
  selector: 'app-ai-provider-model-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TooltipDirective, ProviderModelListComponent],
  template: `
    <div class="space-y-4 border-t border-base-300 pt-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="font-semibold text-base-content">Models</h4>
          <p class="mt-1 text-sm text-base-content/60">
            Attach and edit models available under this provider.
          </p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div class="space-y-3">
          <div class="space-y-2 rounded-2xl border border-base-300 bg-base px-3 py-3">
            <input
              class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="newModelName()"
              (ngModelChange)="newModelName.set($event)"
              placeholder="New model name"
            />
            <input
              class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="newModelFamily()"
              (ngModelChange)="newModelFamily.set($event)"
              placeholder="Family (optional)"
            />
            <button
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-medium text-accent-content transition hover:bg-accent/80"
              type="button"
              (click)="create.emit(); newModelName.set(''); newModelFamily.set('')"
              [disabled]="!newModelName().trim()"
            >
              <app-icon iconName="add" size="sm" aria-hidden="true" />
              Add Model
            </button>
          </div>

          <app-ai-provider-model-list
            [models]="models()"
            [selectedModelId]="selectedModelId()"
            (select)="selectModel.emit($event)"
            (delete)="requestDeleteModel($event)"
          />
        </div>

        <div>
          @if (selectedModel()) {
            <div class="space-y-4">
              <label class="block space-y-2">
                <span class="text-sm font-medium text-base-content/80">Model Name</span>
                <input
                  class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
                  type="text"
                  [ngModel]="modelName()"
                  (ngModelChange)="modelName.set($event)"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-base-content/80">Family</span>
                <input
                  class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
                  type="text"
                  [ngModel]="modelFamily()"
                  (ngModelChange)="modelFamily.set($event)"
                />
              </label>

              <div class="grid gap-4 lg:grid-cols-2">
                <div class="space-y-3 rounded-2xl border border-base-300 bg-base px-4 py-4">
                  <div>
                    <div class="text-sm font-medium text-base-content/80">Input Kinds</div>
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    @for (kind of inputKindSuggestions(); track kind) {
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition"
                        [class.border-primary]="modelInputKinds().includes(kind)"
                        [class.bg-primary/10]="modelInputKinds().includes(kind)"
                        [class.text-primary]="modelInputKinds().includes(kind)"
                        [class.border-base-300]="!modelInputKinds().includes(kind)"
                        [class.text-base-content/70]="!modelInputKinds().includes(kind)"
                        type="button"
                        (click)="toggleInputKind(kind)"
                        [appTooltip]="describeKind(kind)"
                        tooltipPosition="top"
                      >
                        <app-icon [iconName]="iconForKind(kind)" size="sm" aria-hidden="true" />
                      </button>
                    }
                  </div>

                  <div class="flex gap-2">
                    <input
                      class="min-w-0 flex-1 rounded-2xl border border-base-300 bg-base px-4 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
                      type="text"
                      [ngModel]="newInputKind()"
                      (ngModelChange)="newInputKind.set($event)"
                      placeholder="Add input kind"
                    />
                    <button
                      class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
                      type="button"
                      (click)="addInputKind()"
                    >
                      Add
                    </button>
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-medium text-base-content/60">Present on model</div>
                    @if (modelInputKinds().length === 0) {
                      <div class="text-xs text-base-content/45">No input kinds selected.</div>
                    } @else {
                      <div class="grid grid-cols-3 gap-2">
                        @for (kind of modelInputKinds(); track kind) {
                          <button
                            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-200 text-base-content transition hover:bg-base-300"
                            type="button"
                            (click)="removeInputKind(kind)"
                            [appTooltip]="'Remove ' + describeKind(kind)"
                            tooltipPosition="top"
                          >
                            <app-icon [iconName]="iconForKind(kind)" size="sm" aria-hidden="true" />
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>

                <div class="space-y-3 rounded-2xl border border-base-300 bg-base px-4 py-4">
                  <div>
                    <div class="text-sm font-medium text-base-content/80">Output Kinds</div>
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    @for (kind of outputKindSuggestions(); track kind) {
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition"
                        [class.border-primary]="modelOutputKinds().includes(kind)"
                        [class.bg-primary/10]="modelOutputKinds().includes(kind)"
                        [class.text-primary]="modelOutputKinds().includes(kind)"
                        [class.border-base-300]="!modelOutputKinds().includes(kind)"
                        [class.text-base-content/70]="!modelOutputKinds().includes(kind)"
                        type="button"
                        (click)="toggleOutputKind(kind)"
                        [appTooltip]="describeKind(kind)"
                        tooltipPosition="top"
                      >
                        <app-icon [iconName]="iconForKind(kind)" size="sm" aria-hidden="true" />
                      </button>
                    }
                  </div>

                  <div class="flex gap-2">
                    <input
                      class="min-w-0 flex-1 rounded-2xl border border-base-300 bg-base px-4 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
                      type="text"
                      [ngModel]="newOutputKind()"
                      (ngModelChange)="newOutputKind.set($event)"
                      placeholder="Add output kind"
                    />
                    <button
                      class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
                      type="button"
                      (click)="addOutputKind()"
                    >
                      Add
                    </button>
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-medium text-base-content/60">Present on model</div>
                    @if (modelOutputKinds().length === 0) {
                      <div class="text-xs text-base-content/45">No output kinds selected.</div>
                    } @else {
                      <div class="grid grid-cols-3 gap-2">
                        @for (kind of modelOutputKinds(); track kind) {
                          <button
                            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-200 text-base-content transition hover:bg-base-300"
                            type="button"
                            (click)="removeOutputKind(kind)"
                            [appTooltip]="'Remove ' + describeKind(kind)"
                            tooltipPosition="top"
                          >
                            <app-icon [iconName]="iconForKind(kind)" size="sm" aria-hidden="true" />
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  @if (confirmDelete()) {
                    <span class="text-sm text-danger">Delete this model?</span>
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
                      Delete Model
                    </button>
                  }
                </div>

                <button
                  class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
                  type="button"
                  (click)="save.emit()"
                >
                  Save Model
                </button>
              </div>
            </div>
          } @else {
            <div class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-sm text-base-content/60">
              Select a model to edit its details.
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ProviderModelEditorComponent {
  readonly models = input.required<IAiModelResponseDto[]>();
  readonly selectedModelId = input<string | null>(null);

  readonly newModelName = model('');
  readonly newModelFamily = model('');
  readonly modelName = model('');
  readonly modelFamily = model('');
  readonly modelInputKinds = signal<string[]>([]);
  readonly modelOutputKinds = signal<string[]>([]);
  readonly newInputKind = model('');
  readonly newOutputKind = model('');

  readonly create = output<void>();
  readonly selectModel = output<string>();
  readonly save = output<void>();
  readonly delete = output<void>();
  readonly requestDelete = output<string>();

  protected readonly confirmDelete = signal(false);

  protected readonly selectedModel = computed<IAiModelResponseDto | null>(() =>
    this.models().find((model) => model.id === this.selectedModelId()) ?? null,
  );

  protected readonly inputKindSuggestions = computed(() =>
    this.mergeSuggestions(
      [...COMMON_MODEL_INPUT_KINDS],
      this.readKindsFromModels('inputKinds'),
      this.modelInputKinds(),
    ),
  );

  protected readonly outputKindSuggestions = computed(() =>
    this.mergeSuggestions(
      [...COMMON_MODEL_OUTPUT_KINDS],
      this.readKindsFromModels('outputKinds'),
      this.modelOutputKinds(),
    ),
  );

  hydrate(model: IAiModelResponseDto | null): void {
    this.modelName.set(model?.name || '');
    this.modelFamily.set(model?.family || '');
    this.modelInputKinds.set(this.readModelKinds(model, 'inputKinds'));
    this.modelOutputKinds.set(this.readModelKinds(model, 'outputKinds'));
    this.newInputKind.set('');
    this.newOutputKind.set('');
    this.confirmDelete.set(false);
  }

  read(): IModelDraft {
    return {
      name: this.modelName().trim(),
      family: this.modelFamily().trim(),
      inputKinds: this.modelInputKinds(),
      outputKinds: this.modelOutputKinds(),
    };
  }

  readNewModel(): { name: string; family: string } {
    return {
      name: this.newModelName().trim(),
      family: this.newModelFamily().trim(),
    };
  }

  readCapabilities(model: IAiModelResponseDto): Record<string, unknown> | undefined {
    const capabilities = this.readCapabilitiesFromModel(model);
    const inputKinds = this.modelInputKinds();
    const outputKinds = this.modelOutputKinds();

    const next: IAiModelCapabilitiesDraft = {
      chat: capabilities?.chat,
      streaming: capabilities?.streaming,
      embeddings: capabilities?.embeddings,
      vision: capabilities?.vision,
      functionCalling: capabilities?.functionCalling,
      inputKinds: inputKinds.length > 0 ? inputKinds : undefined,
      outputKinds: outputKinds.length > 0 ? outputKinds : undefined,
    };

    const hasValues = Object.values(next).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined,
    );

    return hasValues ? (next as Record<string, unknown>) : undefined;
  }

  protected toggleInputKind(kind: string): void {
    if (this.modelInputKinds().includes(kind)) {
      this.removeInputKind(kind);
      return;
    }
    this.modelInputKinds.update((current) => this.mergeStringArray(current, [kind]));
  }

  protected addInputKind(): void {
    const kind = this.newInputKind().trim();
    if (!kind) return;
    this.modelInputKinds.update((current) => this.mergeStringArray(current, [kind]));
    this.newInputKind.set('');
  }

  protected removeInputKind(kind: string): void {
    this.modelInputKinds.update((current) => current.filter((item) => item !== kind));
  }

  protected toggleOutputKind(kind: string): void {
    if (this.modelOutputKinds().includes(kind)) {
      this.removeOutputKind(kind);
      return;
    }
    this.modelOutputKinds.update((current) => this.mergeStringArray(current, [kind]));
  }

  protected addOutputKind(): void {
    const kind = this.newOutputKind().trim();
    if (!kind) return;
    if (this.isDisabledOutputKind(kind)) {
      this.newOutputKind.set('');
      return;
    }
    this.modelOutputKinds.update((current) => this.mergeStringArray(current, [kind]));
    this.newOutputKind.set('');
  }

  protected removeOutputKind(kind: string): void {
    this.modelOutputKinds.update((current) => current.filter((item) => item !== kind));
  }

  protected requestDeleteModel(modelId: string): void {
    this.requestDelete.emit(modelId);
  }

  protected iconForKind(kind: string): string {
    return KIND_META[kind]?.icon ?? 'category';
  }

  protected describeKind(kind: string): string {
    return KIND_META[kind]?.tooltip ?? kind;
  }

  private isDisabledOutputKind(kind: string): boolean {
    return DISABLED_OUTPUT_KINDS.has(kind.trim().toLowerCase());
  }

  private readCapabilitiesFromModel(model: IAiModelResponseDto | null): IAiModelCapabilitiesDraft | null {
    const capabilities = model?.capabilities;
    if (!capabilities || typeof capabilities !== 'object') {
      return null;
    }
    return capabilities as IAiModelCapabilitiesDraft;
  }

  private readModelKinds(
    model: IAiModelResponseDto | null,
    key: 'inputKinds' | 'outputKinds',
  ): string[] {
    const capabilities = this.readCapabilitiesFromModel(model);
    const values = this.readStringArray(capabilities?.[key]);
    return key === 'outputKinds'
      ? values.filter((kind) => !this.isDisabledOutputKind(kind))
      : values;
  }

  private readKindsFromModels(key: 'inputKinds' | 'outputKinds'): string[] {
    return this.models().flatMap((model) => this.readModelKinds(model, key));
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return this.mergeStringArray(
      [],
      value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
    );
  }

  private mergeSuggestions(...sources: readonly string[][]): string[] {
    return this.mergeStringArray([], ...sources);
  }

  private mergeStringArray(initial: readonly string[], ...sources: readonly string[][]): string[] {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const item of initial) {
      const normalized = item.trim();
      const key = normalized.toLowerCase();
      if (!normalized || seen.has(key)) continue;
      seen.add(key);
      values.push(normalized);
    }

    for (const source of sources) {
      for (const item of source) {
        const normalized = item.trim();
        const key = normalized.toLowerCase();
        if (!normalized || seen.has(key)) continue;
        seen.add(key);
        values.push(normalized);
      }
    }

    return values;
  }
}
