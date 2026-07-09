import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewContainerRef, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AiPromptType, IAiPromptResponseDto, IAiPromptTypeResponseDto, IAiPromptVariable } from '@genspire/sdk-ai';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { OverlayService } from '../../../../shared/overlay';
import { IconComponent } from '../../../../icons/icon.component';

interface IPromptTypeOption {
  value: string;
  label: string;
  isSystem: boolean;
}

export interface IPromptEditorOutput {
  name: string;
  description: string;
  version: string;
  type: AiPromptType;
  isDefault: boolean;
  argumentHint: string;
  template: string;
  variables: IAiPromptVariable[];
}

@Component({
  selector: 'app-ai-prompt-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (prompt()) {
      <div class="flex flex-col gap-6">
        <div class="grid gap-4 md:grid-cols-3">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Prompt ID</span>
            <input
              class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary read-only:cursor-default read-only:text-base-content/60"
              type="text"
              [ngModel]="id()"
              readonly
            />
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Version</span>
            <input
              class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="version()"
              (ngModelChange)="version.set($event)"
            />
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Type</span>
            <select
              class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
              [ngModel]="type()"
              (ngModelChange)="type.set($event)"
            >
              @for (option of promptTypeOptions(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-medium text-base-content/80">Name</span>
          <input
            class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="name()"
            (ngModelChange)="name.set($event)"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-medium text-base-content/80">Description</span>
          <input
            class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="description()"
            (ngModelChange)="description.set($event)"
          />
        </label>

        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
              [ngModel]="isDefault()"
              (ngModelChange)="isDefault.set($event)"
            />
            <span class="text-sm font-medium text-base-content/80">Set as default for {{ type() }}</span>
          </label>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-medium text-base-content/80">Variables</span>
              <p class="mt-0.5 text-xs text-base-content/55">
                Required variables must be referenced in the template as <code class="rounded bg-base-200 px-1 py-0.5 text-[11px]">{{'{{variable}}'}}</code>.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 rounded-2xl border border-base-300 bg-base p-3">
            @for (variable of variables(); track variable.name) {
              <span class="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5 text-xs font-medium text-base-content">
                <span class="flex items-center gap-1">
                  <span class="text-primary">{{'{{' + variable.name + '}}'}}</span>
                  @if (variable.defaultValue !== undefined && variable.defaultValue !== null && variable.defaultValue !== '') {
                    <span class="text-base-content/50">= {{ variable.defaultValue }}</span>
                  }
                </span>
                @if (variable.required) {
                  <span class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Required</span>
                }
                <button
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full text-base-content/60 transition hover:bg-base-300 hover:text-base-content"
                  type="button"
                  (click)="removeVariable(variable.name)"
                  aria-label="Remove {{ variable.name }}"
                >
                  <app-icon iconName="close" size="sm" aria-hidden="true" />
                </button>
              </span>
            }
            <button
              class="inline-flex items-center gap-1 rounded-full border border-dashed border-base-300 px-3 py-1.5 text-xs font-medium text-base-content/60 transition hover:border-primary hover:text-primary hover:bg-primary/5"
              type="button"
              (click)="openVariableEditor()"
            >
              <app-icon iconName="add" size="sm" aria-hidden="true" />
              Add
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-medium text-base-content/80">Argument Hint</span>
          <input
            class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="argumentHint()"
            (ngModelChange)="argumentHint.set($event)"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-medium text-base-content/80">Template</span>
          <textarea
            class="min-h-72 rounded-3xl border border-base-300 bg-base px-4 py-3 text-sm text-base-content outline-none transition focus:border-primary"
            [ngModel]="template()"
            (ngModelChange)="template.set($event)"
            [attr.placeholder]="'Use {{variable}} to reference variables...'"
          ></textarea>
        </label>

        <div class="flex items-center justify-between gap-4">
          <button
            class="inline-flex items-center gap-2 rounded-2xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
            type="button"
            (click)="openDeleteConfirmation()"
          >
            Delete Prompt
          </button>

          <button
            class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
            type="button"
            (click)="save.emit()"
          >
            Save Prompt
          </button>
        </div>
      </div>
    } @else {
      <div class="flex h-full min-h-64 items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base px-6 text-center text-sm text-base-content/60">
        Select a prompt or create a new one to start editing.
      </div>
    }

    <ng-template #variableEditor let-overlay>
      <div class="w-md overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <div class="px-4 py-3">
          <h3 class="text-sm font-semibold text-base-content">Add Variable</h3>
        </div>
        <div class="space-y-4 p-4">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Variable Name</span>
            <input
              class="rounded-xl border border-base-300 bg-base px-3 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="newVariableName()"
              (ngModelChange)="newVariableName.set($event)"
              placeholder="e.g., topic, tone, max_tokens"
              autofocus
            />
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Description (optional)</span>
            <input
              class="rounded-xl border border-base-300 bg-base px-3 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="newVariableDescription()"
              (ngModelChange)="newVariableDescription.set($event)"
              placeholder="What this variable is for"
            />
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-base-content/80">Default Value (optional)</span>
            <input
              class="rounded-xl border border-base-300 bg-base px-3 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="text"
              [ngModel]="newVariableDefaultValue()"
              (ngModelChange)="newVariableDefaultValue.set($event)"
              placeholder="Default value if not provided"
            />
          </label>

          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
              [ngModel]="newVariableRequired()"
              (ngModelChange)="newVariableRequired.set($event)"
            />
            <span class="text-sm font-medium text-base-content/80">Required</span>
          </label>

          @if (variableError()) {
            <div class="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
              {{ variableError() }}
            </div>
          }
        </div>
        <div class="flex justify-end gap-2 px-4 py-3">
          <button
            class="rounded-2xl border border-base-300 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
            type="button"
            (click)="addVariable(overlay)"
          >
            Add
          </button>
        </div>
      </div>
    </ng-template>

    <ng-template #deleteConfirmation let-overlay>
      <div class="w-[24rem] overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <div class="px-4 py-3">
          <h3 class="text-sm font-semibold text-base-content">Delete Prompt</h3>
        </div>
        <div class="p-4">
          <p class="text-sm text-base-content/70">
            Are you sure you want to delete <strong class="text-base-content">{{ prompt()?.name }}</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div class="flex justify-end gap-2 px-4 py-3">
          <button
            class="rounded-xl border border-base-300 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-danger-content transition hover:bg-danger/85"
            type="button"
            (click)="confirmDelete(overlay)"
          >
            Delete
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class PromptEditorComponent {
  readonly prompt = input<IAiPromptResponseDto | null>(null);
  readonly promptTypes = input<IAiPromptTypeResponseDto[]>([]);

  readonly id = model('');
  readonly name = model('');
  readonly description = model('');
  readonly version = model('');
  readonly type = model<AiPromptType>('system_prompt');
  readonly isDefault = model(false);
  readonly argumentHint = model('');
  readonly template = model('');
  readonly variables = model<IAiPromptVariable[]>([]);

  readonly save = output<void>();
  readonly delete = output<void>();

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private readonly variableEditorTemplate = viewChild.required<TemplateRef<unknown>>('variableEditor');
  private readonly deleteConfirmationTemplate = viewChild.required<TemplateRef<unknown>>('deleteConfirmation');
  protected readonly promptTypeOptions = computed<readonly IPromptTypeOption[]>(() => {
    const baseOptions = this.promptTypes()
      .map((item) => ({
        value: item.id,
        label: item.name,
        isSystem: item.isSystem,
      }));
    const currentType = this.type().trim();
    if (!currentType || baseOptions.some((option) => option.value === currentType)) {
      return baseOptions;
    }

    return [
      ...baseOptions,
      {
        value: currentType,
        label: currentType.replaceAll('_', ' '),
        isSystem: false,
      },
    ];
  });

  readonly newVariableName = signal('');
  readonly newVariableDescription = signal('');
  readonly newVariableDefaultValue = signal('');
  readonly newVariableRequired = signal(false);
  readonly variableError = signal('');

  private resolveDefaultPromptType(): AiPromptType {
    return this.promptTypes()[0]?.id ?? 'system_prompt';
  }

  hydrate(prompt: IAiPromptResponseDto | null): void {
    if (!prompt) {
      this.id.set('');
      this.name.set('');
      this.description.set('');
      this.version.set('');
      this.type.set(this.resolveDefaultPromptType());
      this.isDefault.set(false);
      this.argumentHint.set('');
      this.template.set('');
      this.variables.set([]);
      return;
    }

    this.id.set(prompt.id);
    this.name.set(prompt.name ?? '');
    this.description.set(prompt.description ?? '');
    this.version.set(prompt.version ?? '');
    this.type.set(prompt.type ?? this.resolveDefaultPromptType());
    this.isDefault.set(prompt.isDefault ?? false);
    this.argumentHint.set(prompt.argumentHint ?? '');
    this.template.set(formatPromptTemplate(prompt.template));
    this.variables.set(prompt.variables ? [...prompt.variables] : []);
  }

  read(): IPromptEditorOutput {
    return {
      name: this.name().trim() || 'Untitled Prompt',
      description: this.description().trim(),
      version: this.version().trim() || '1.0.0',
      type: this.type(),
      isDefault: this.isDefault(),
      argumentHint: this.argumentHint().trim(),
      template: this.template(),
      variables: this.variables(),
    };
  }

  protected openVariableEditor(): void {
    this.newVariableName.set('');
    this.newVariableDescription.set('');
    this.newVariableDefaultValue.set('');
    this.newVariableRequired.set(false);
    this.variableError.set('');

    const templateRef = this.variableEditorTemplate();
    this.overlayService.createModalTemplate(
      {
        templateRef,
        viewContainerRef: this.viewContainerRef,
      },
      {
        panelClass: 'app-variable-editor-overlay',
      },
    );
  }

  protected addVariable(overlay: AppOverlayHandle): void {
    const name = this.newVariableName().trim();
    if (!name) {
      this.variableError.set('Variable name is required.');
      return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      this.variableError.set('Variable name must start with a letter or underscore, and contain only letters, numbers, and underscores.');
      return;
    }

    if (this.variables().some((v) => v.name === name)) {
      this.variableError.set('A variable with this name already exists.');
      return;
    }

    const newVariable: IAiPromptVariable = {
      name,
      description: this.newVariableDescription().trim() || undefined,
      required: this.newVariableRequired(),
      defaultValue: this.newVariableDefaultValue().trim() || undefined,
    };

    this.variables.update((current) => [...current, newVariable]);
    overlay.close();
  }

  protected removeVariable(variableName: string): void {
    this.variables.update((current) => current.filter((v) => v.name !== variableName));
  }

  protected openDeleteConfirmation(): void {
    const templateRef = this.deleteConfirmationTemplate();
    this.overlayService.createModalTemplate(
      {
        templateRef,
        viewContainerRef: this.viewContainerRef,
      },
      {
        panelClass: 'app-delete-confirmation-overlay',
      },
    );
  }

  protected confirmDelete(overlay: AppOverlayHandle): void {
    overlay.close();
    this.delete.emit();
  }
}

function formatPromptTemplate(template: string | readonly unknown[]): string {
  if (typeof template === 'string') {
    return template;
  }
  return JSON.stringify(template, null, 2);
}
