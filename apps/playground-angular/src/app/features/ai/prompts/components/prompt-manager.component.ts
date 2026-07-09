import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import type { AiPromptTemplate, AiPromptType, IAiPromptResponseDto, IAiPromptTypeResponseDto, IAiPromptVariable } from '@genspire/sdk-ai';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { IconComponent } from '../../../../icons/icon.component';
import { AiPromptClient } from '../ai-prompt.client';
import { PromptEditorComponent, type IPromptEditorOutput } from './prompt-editor.component';
import { PromptListComponent } from './prompt-list.component';

@Component({
  selector: 'app-ai-prompt-manager',
  standalone: true,
  imports: [CommonModule, IconComponent, PromptListComponent, PromptEditorComponent],
  template: `
    <div class="h-[min(44rem,calc(100vh-2rem))] w-[min(72rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
      <div class="grid h-full min-h-0 grid-cols-[20rem_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col border-r border-base-300 bg-base p-4">
          <app-ai-prompt-list
            [prompts]="prompts()"
            [promptTypes]="promptTypes()"
            [selectedPromptId]="selectedPromptId()"
            [search]="search()"
            (searchChange)="search.set($event)"
            (select)="selectPrompt($event)"
            (create)="createPrompt()"
          />
        </aside>

        <section class="flex min-h-0 flex-col bg-base-100">
          <header class="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100 px-6 py-5">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-base-content">
                {{ selectedPrompt()?.name || 'Prompt Editor' }}
              </h2>
              <div class="mt-1 text-sm text-base-content/60">
                Edit prompt metadata, type, variables and template.
              </div>
            </div>

            <button
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-base-300 bg-base text-base-content transition hover:border-base-content/30 hover:bg-base-200"
              type="button"
              (click)="close()"
              aria-label="Close prompt manager"
            >
              <app-icon iconName="close" size="sm" aria-hidden="true" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6">
            <app-ai-prompt-editor
              [prompt]="selectedPrompt()"
              [promptTypes]="promptTypes()"
              [id]="editorId()"
              [name]="editorName()"
              [description]="editorDescription()"
              [version]="editorVersion()"
              [type]="editorType()"
              [isDefault]="editorIsDefault()"
              [argumentHint]="editorArgumentHint()"
              [template]="editorTemplate()"
              [variables]="editorVariables()"
              (idChange)="editorId.set($event)"
              (nameChange)="editorName.set($event)"
              (descriptionChange)="editorDescription.set($event)"
              (versionChange)="editorVersion.set($event)"
              (typeChange)="editorType.set($event)"
              (isDefaultChange)="editorIsDefault.set($event)"
              (argumentHintChange)="editorArgumentHint.set($event)"
              (templateChange)="editorTemplate.set($event)"
              (variablesChange)="editorVariables.set($event)"
              (save)="savePrompt()"
              (delete)="requestDeletePrompt()"
            />
          </div>
        </section>
      </div>
    </div>
  `,
})
export class PromptManagerComponent implements OnInit {
  readonly overlayHandle = input<AppOverlayHandle | null>(null);

  private readonly promptClient = inject(AiPromptClient);

  protected readonly prompts = signal<IAiPromptResponseDto[]>([]);
  protected readonly promptTypes = signal<IAiPromptTypeResponseDto[]>([]);
  protected readonly selectedPromptId = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly selectedPrompt = signal<IAiPromptResponseDto | null>(null);

  readonly editorId = signal('');
  readonly editorName = signal('');
  readonly editorDescription = signal('');
  readonly editorVersion = signal('');
  readonly editorType = signal<AiPromptType>('system_prompt');
  readonly editorIsDefault = signal(false);
  readonly editorArgumentHint = signal('');
  readonly editorTemplate = signal('');
  readonly editorVariables = signal<IAiPromptVariable[]>([]);

  private resolveDefaultPromptType(): AiPromptType {
    return this.promptTypes()[0]?.id ?? 'system_prompt';
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.reloadPromptTypes(),
      this.reloadPrompts(),
    ]);
  }

  protected close(): void {
    this.overlayHandle()?.close();
  }

  private async reloadPrompts(): Promise<void> {
    const prompts = await this.promptClient.listPrompts();
    this.prompts.set(prompts);

    const selectedId = this.selectedPromptId();
    const nextPrompt =
      (selectedId ? prompts.find((item) => item.id === selectedId) : null)
      ?? prompts[0]
      ?? null;

    this.selectedPromptId.set(nextPrompt?.id ?? null);
    this.selectedPrompt.set(nextPrompt);
    this.hydrateEditor(nextPrompt);
  }

  private async reloadPromptTypes(): Promise<void> {
    this.promptTypes.set(await this.promptClient.listPromptTypes());
  }

  protected selectPrompt(promptId: string): void {
    this.selectedPromptId.set(promptId);
    const promptItem = this.prompts().find((item) => item.id === promptId) ?? null;
    this.selectedPrompt.set(promptItem);
    this.hydrateEditor(promptItem);
  }

  protected async createPrompt(): Promise<void> {
    const nextIndex = this.prompts().length + 1;
    const created = await this.promptClient.createPrompt({
      name: `Prompt ${nextIndex}`,
      description: '',
      version: '1.0.0',
      type: this.resolveDefaultPromptType(),
      isDefault: false,
      argumentHint: '',
      variables: [],
      template: 'Write your prompt here.',
    });

    this.prompts.update((current) => [created, ...current]);
    this.selectedPromptId.set(created.id);
    this.selectedPrompt.set(created);
    this.hydrateEditor(created);
  }

  protected async savePrompt(): Promise<void> {
    const promptItem = this.selectedPrompt();
    if (!promptItem) {
      return;
    }

    const output: IPromptEditorOutput = {
      name: this.editorName().trim() || 'Untitled Prompt',
      description: this.editorDescription().trim(),
      version: this.editorVersion().trim() || '1.0.0',
      type: this.editorType(),
      isDefault: this.editorIsDefault(),
      argumentHint: this.editorArgumentHint().trim(),
      template: this.editorTemplate(),
      variables: this.editorVariables(),
    };

    const updated = await this.promptClient.updatePrompt(promptItem.id, {
      name: output.name,
      description: output.description,
      version: output.version,
      type: output.type,
      isDefault: output.isDefault,
      argumentHint: output.argumentHint,
      variables: output.variables,
      template: this.parseTemplate(output.template),
    });

    this.prompts.update((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    this.selectedPromptId.set(updated.id);
    this.selectedPrompt.set(updated);
    this.hydrateEditor(updated);
  }

  protected async requestDeletePrompt(): Promise<void> {
    const promptItem = this.selectedPrompt();
    if (!promptItem) {
      return;
    }

    await this.promptClient.deletePrompt(promptItem.id);
    this.prompts.update((current) => current.filter((item) => item.id !== promptItem.id));

    const nextPrompt = this.prompts()[0] ?? null;
    this.selectedPromptId.set(nextPrompt?.id ?? null);
    this.selectedPrompt.set(nextPrompt);
    this.hydrateEditor(nextPrompt);
  }

  private hydrateEditor(prompt: IAiPromptResponseDto | null): void {
    if (!prompt) {
      this.editorId.set('');
      this.editorName.set('');
      this.editorDescription.set('');
      this.editorVersion.set('');
      this.editorType.set(this.resolveDefaultPromptType());
      this.editorIsDefault.set(false);
      this.editorArgumentHint.set('');
      this.editorTemplate.set('');
      this.editorVariables.set([]);
      return;
    }

    this.editorId.set(prompt.id);
    this.editorName.set(prompt.name ?? '');
    this.editorDescription.set(prompt.description ?? '');
    this.editorVersion.set(prompt.version ?? '');
    this.editorType.set(prompt.type ?? this.resolveDefaultPromptType());
    this.editorIsDefault.set(prompt.isDefault ?? false);
    this.editorArgumentHint.set(prompt.argumentHint ?? '');
    this.editorTemplate.set(this.formatTemplate(prompt.template));
    this.editorVariables.set(prompt.variables ? [...prompt.variables] : []);
  }

  private formatTemplate(template: string | readonly unknown[]): string {
    if (typeof template === 'string') {
      return template;
    }
    return JSON.stringify(template, null, 2);
  }

  private parseTemplate(template: string): AiPromptTemplate {
    const value = template.trim();
    if (!value) {
      return '';
    }
    if (!value.startsWith('[') && !value.startsWith('{')) {
      return template;
    }
    try {
      const parsed: unknown = JSON.parse(template);
      return this.isPromptMessageArray(parsed) ? parsed : template;
    } catch {
      return template;
    }
  }

  private isPromptMessageArray(value: unknown): value is Exclude<AiPromptTemplate, string> {
    return Array.isArray(value)
      && value.every((item) =>
        typeof item === 'object'
        && item !== null
        && typeof (item as Record<string, unknown>)['role'] === 'string'
        && 'content' in (item as Record<string, unknown>),
      );
  }
}
