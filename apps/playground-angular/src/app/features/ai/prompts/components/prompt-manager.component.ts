import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, model, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AiPromptTemplate, IAiPromptResponseDto } from '@genspire/sdk-ai';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { IconComponent } from '../../../../icons/icon.component';
import { AiPromptClient } from '../ai-prompt.client';

function formatPromptTemplate(template: AiPromptTemplate): string {
  if (typeof template === 'string') {
    return template;
  }

  return JSON.stringify(template, null, 2);
}

function parsePromptTemplate(template: string): AiPromptTemplate {
  const value = template.trim();

  if (!value) {
    return '';
  }

  if (!value.startsWith('[') && !value.startsWith('{')) {
    return template;
  }

  try {
    return JSON.parse(template) as AiPromptTemplate;
  } catch {
    return template;
  }
}

@Component({
  selector: 'app-ai-prompt-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="h-[min(44rem,calc(100vh-2rem))] w-[min(72rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
      <div class="grid h-full min-h-0 grid-cols-[20rem_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col border-r border-base-300 bg-base p-4">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-base-content">Prompt List</h3>
              <p class="mt-1 text-sm text-base-content/60">
                Search, add, and select prompts.
              </p>
            </div>

            <button
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-content transition hover:bg-accent/80"
              type="button"
              (click)="createPrompt()"
              aria-label="Create prompt"
            >
              <app-icon iconName="add" size="sm" aria-hidden="true" />
            </button>
          </div>

          <label class="relative mb-4 min-w-0">
            <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
              <app-icon iconName="search" size="sm" aria-hidden="true" />
            </span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base-100 px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
              type="search"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              placeholder="Search prompts"
            />
          </label>

          <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            @if (filteredPrompts().length === 0) {
              <div class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-sm text-base-content/60">
                No prompts found.
              </div>
            } @else {
              @for (promptItem of filteredPrompts(); track promptItem.id) {
              <button
                class="block w-full rounded-2xl border px-4 py-3 text-left transition"
                [class.border-primary]="promptItem.id === selectedPromptId()"
                [class.bg-base-200]="promptItem.id === selectedPromptId()"
                [class.border-base-300]="promptItem.id !== selectedPromptId()"
                [class.bg-base-100]="promptItem.id !== selectedPromptId()"
                type="button"
                (click)="selectPrompt(promptItem.id)"
              >
                <div class="text-sm font-semibold text-base-content">{{ promptItem.name }}</div>
                @if (promptItem.description) {
                  <div class="mt-2 line-clamp-2 text-xs text-base-content/60">
                    {{ promptItem.description }}
                  </div>
                }
              </button>
              }
            }
          </div>
        </aside>

        <section class="flex min-h-0 flex-col bg-base-100">
          <header class="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100 px-6 py-5">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-base-content">
                {{ selectedPrompt()?.name || 'Prompt Editor' }}
              </h2>
              <div class="mt-1 text-sm text-base-content/60">
                Edit prompt metadata and template content.
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
            @if (selectedPrompt()) {
              <div class="flex flex-col gap-6">
                <div class="grid gap-4 md:grid-cols-2">
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
                  ></textarea>
                </label>

                <div class="flex items-center justify-between gap-4">
                  <button
                class="inline-flex items-center gap-2 rounded-2xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
                    type="button"
                    [disabled]="!selectedPrompt()"
                    (click)="requestDeletePrompt()"
                  >
                    Delete Prompt
                  </button>

                  <button
                    class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
                    type="button"
                    (click)="savePrompt()"
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
  protected readonly selectedPromptId = signal<string | null>(null);
  protected readonly search = model('');
  protected readonly selectedPrompt = computed<IAiPromptResponseDto | null>(() =>
    this.prompts().find((item) => item.id === this.selectedPromptId()) ?? null,
  );
  protected readonly filteredPrompts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const prompts = this.prompts();

    if (!query) {
      return prompts;
    }

    return prompts.filter((item) =>
      item.id.toLowerCase().includes(query)
      || (item.name ?? '').toLowerCase().includes(query)
      || (item.description ?? '').toLowerCase().includes(query)
      || (item.argumentHint ?? '').toLowerCase().includes(query),
    );
  });

  readonly id = model('');
  readonly name = model('');
  readonly description = model('');
  readonly version = model('');
  readonly argumentHint = model('');
  readonly template = model('');

  async ngOnInit(): Promise<void> {
    await this.reloadPrompts();
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
    this.hydrate(nextPrompt);
  }

  protected selectPrompt(promptId: string): void {
    this.selectedPromptId.set(promptId);
    const promptItem = this.prompts().find((item) => item.id === promptId) ?? null;
    this.hydrate(promptItem);
  }

  protected async createPrompt(): Promise<void> {
    const nextIndex = this.prompts().length + 1;
    const created = await this.promptClient.createPrompt({
      name: `Prompt ${nextIndex}`,
      description: '',
      version: '1.0.0',
      argumentHint: '',
      template: 'Write your prompt here.',
    });

    this.prompts.update((current) => [created, ...current]);
    this.selectedPromptId.set(created.id);
    this.hydrate(created);
  }

  protected async savePrompt(): Promise<void> {
    const promptItem = this.selectedPrompt();
    if (!promptItem) {
      return;
    }

    const updated = await this.promptClient.updatePrompt(promptItem.id, {
      name: this.name().trim() || 'Untitled Prompt',
      description: this.description().trim(),
      version: this.version().trim() || '1.0.0',
      argumentHint: this.argumentHint().trim(),
      template: parsePromptTemplate(this.template()),
    });

    this.prompts.update((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    this.selectedPromptId.set(updated.id);
    this.hydrate(updated);
  }

  protected async requestDeletePrompt(): Promise<void> {
    const promptItem = this.selectedPrompt();
    if (!promptItem) {
      return;
    }

    const confirmed = globalThis.confirm?.(
      `Delete prompt "${promptItem.name}" (${promptItem.id})?`,
    ) ?? false;

    if (!confirmed) {
      return;
    }

    await this.promptClient.deletePrompt(promptItem.id);
    this.prompts.update((current) => current.filter((item) => item.id !== promptItem.id));

    const nextPrompt = this.filteredPrompts()[0] ?? this.prompts()[0] ?? null;
    this.selectedPromptId.set(nextPrompt?.id ?? null);
    this.hydrate(nextPrompt);
  }

  private hydrate(promptItem: IAiPromptResponseDto | null): void {
    if (!promptItem) {
      this.id.set('');
      this.name.set('');
      this.description.set('');
      this.version.set('');
      this.argumentHint.set('');
      this.template.set('');
      return;
    }

    this.id.set(promptItem.id);
    this.name.set(promptItem.name ?? '');
    this.description.set(promptItem.description ?? '');
    this.version.set(promptItem.version ?? '');
    this.argumentHint.set(promptItem.argumentHint ?? '');
    this.template.set(formatPromptTemplate(promptItem.template));
  }
}
