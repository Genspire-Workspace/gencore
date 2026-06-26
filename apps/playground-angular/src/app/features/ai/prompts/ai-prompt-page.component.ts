// file: apps\playground-angular\src\app\features\ai\prompts\ai-prompt-page.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AiPromptService } from './ai-prompt.service';
import type {
  AiPromptVisibilityDto,
  IAiPromptResponseDto,
  IAiPromptVariableDto,
  ICreateAiPromptRequestDto,
  IUpdateAiPromptRequestDto,
} from './ai-prompt.types';
import type { IProblemDetails } from '../../../core/problem-details';

interface IPromptFormState {
  id: string | null;
  visibility: AiPromptVisibilityDto;
  name: string;
  description: string;
  argumentHint: string;
  version: string;
  template: string;
  variables: string;
  metadata: string;
}

const EMPTY_FORM: IPromptFormState = {
  id: null,
  visibility: 'private',
  name: '',
  description: '',
  argumentHint: '',
  version: '',
  template: '',
  variables: '',
  metadata: '',
};

@Component({
  selector: 'app-ai-prompt-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
              AI
            </p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Prompts
            </h1>
            <p class="mt-3 max-w-2xl text-sm text-slate-500">
              Create, edit and remove persisted prompts that can be reused
              across AI sessions.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="reload()"
              [disabled]="loading() || saving()"
            >
              Refresh
            </button>
            <button
              class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              (click)="openCreate()"
              [disabled]="loading() || saving()"
            >
              New prompt
            </button>
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="mt-4 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ error() }}
        </div>
      }

      <div class="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          @if (loading() && prompts().length === 0) {
            <div class="flex flex-1 items-center justify-center text-sm text-slate-500">
              Loading prompts...
            </div>
          } @else if (prompts().length === 0) {
            <div class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              No prompts yet. Click "New prompt" to create one.
            </div>
          } @else {
            <div class="h-full space-y-3 overflow-y-auto pr-2">
              @for (prompt of prompts(); track prompt.id) {
                <article
                  class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                  [class.border-sky-300]="editingId() === prompt.id"
                  [class.bg-sky-50]="editingId() === prompt.id"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                          {{ prompt.visibility }}
                        </span>
                        @if (prompt.version) {
                          <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                            v{{ prompt.version }}
                          </span>
                        }
                        <h3 class="truncate text-base font-semibold text-slate-900">
                          {{ prompt.name }}
                        </h3>
                      </div>
                      @if (prompt.description) {
                        <p class="mt-1 text-sm text-slate-600">{{ prompt.description }}</p>
                      }
                      @if (prompt.argumentHint) {
                        <p class="mt-1 text-xs text-slate-400">args: {{ prompt.argumentHint }}</p>
                      }
                      <p class="mt-2 break-all text-[11px] text-slate-400">{{ prompt.id }}</p>
                    </div>

                    <div class="flex shrink-0 flex-wrap gap-2">
                      <button
                        class="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        (click)="openEdit(prompt)"
                        [disabled]="saving()"
                      >
                        Edit
                      </button>
                      <button
                        class="rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        (click)="remove(prompt)"
                        [disabled]="saving()"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        </div>

        @if (formOpen()) {
          <form
            class="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[28rem]"
            (ngSubmit)="save()"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold text-slate-900">
                {{ form().id ? 'Edit prompt' : 'New prompt' }}
              </h2>
              <button
                class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                type="button"
                (click)="closeForm()"
              >
                Close
              </button>
            </div>

            <div class="mt-4 h-full min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Name</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().name"
                  (ngModelChange)="patchForm('name', $event)"
                  name="name"
                  required
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Visibility</span>
                <select
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().visibility"
                  (ngModelChange)="patchForm('visibility', $event)"
                  name="visibility"
                >
                  <option value="private">private</option>
                  <option value="shared">shared</option>
                  <option value="system">system</option>
                </select>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Description</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().description"
                  (ngModelChange)="patchForm('description', $event)"
                  name="description"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Argument hint</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().argumentHint"
                  (ngModelChange)="patchForm('argumentHint', $event)"
                  name="argumentHint"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Version</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().version"
                  (ngModelChange)="patchForm('version', $event)"
                  name="version"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Template (JSON)</span>
                <textarea
                  class="min-h-40 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().template"
                  (ngModelChange)="patchForm('template', $event)"
                  name="template"
                  placeholder='"You are a helpful assistant."'
                  required
                ></textarea>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Variables (JSON array)</span>
                <textarea
                  class="min-h-28 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().variables"
                  (ngModelChange)="patchForm('variables', $event)"
                  name="variables"
                  placeholder='[{"name":"topic","required":true}]'
                ></textarea>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Metadata (JSON object)</span>
                <textarea
                  class="min-h-24 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().metadata"
                  (ngModelChange)="patchForm('metadata', $event)"
                  name="metadata"
                  placeholder='{}'
                ></textarea>
              </label>
            </div>

            <div class="mt-4 shrink-0">
              @if (formError()) {
                <p class="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {{ formError() }}
                </p>
              }
              <div class="flex items-center justify-end gap-3">
                <button
                  class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  type="button"
                  (click)="closeForm()"
                >
                  Cancel
                </button>
                <button
                  class="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  type="submit"
                  [disabled]="saving() || !form().name.trim() || !form().template.trim()"
                >
                  {{ saving() ? 'Saving...' : 'Save prompt' }}
                </button>
              </div>
            </div>
          </form>
        }
      </div>
    </section>
  `,
})
export class AiPromptPageComponent {
  private readonly aiPromptService = inject(AiPromptService);

  protected readonly prompts = signal<IAiPromptResponseDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formOpen = signal(false);
  protected readonly formError = signal('');
  protected readonly form = signal<IPromptFormState>({ ...EMPTY_FORM });

  protected editingId = signal<string | null>(null);

  constructor() {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      this.prompts.set(await this.aiPromptService.list());
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEdit(prompt: IAiPromptResponseDto): void {
    this.editingId.set(prompt.id);
    this.form.set({
      id: prompt.id,
      visibility: prompt.visibility,
      name: prompt.name,
      description: prompt.description ?? '',
      argumentHint: prompt.argumentHint ?? '',
      version: prompt.version ?? '',
      template: this.toEditableJson(prompt.template),
      variables: prompt.variables ? this.toEditableJson(prompt.variables) : '',
      metadata: prompt.metadata ? this.toEditableJson(prompt.metadata) : '',
    });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formError.set('');
  }

  protected patchForm<TKey extends keyof IPromptFormState>(
    key: TKey,
    value: IPromptFormState[TKey],
  ): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  protected async save(): Promise<void> {
    const form = this.form();
    if (!form.name.trim() || !form.template.trim() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      const template = this.parseJson(form.template, 'template');
      const variables = form.variables.trim()
        ? this.parseJsonArray<IAiPromptVariableDto>(form.variables, 'variables')
        : undefined;
      const metadata = form.metadata.trim()
        ? this.parseJsonObject(form.metadata, 'metadata')
        : undefined;

      if (form.id) {
        const payload: IUpdateAiPromptRequestDto = {
          visibility: form.visibility,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          argumentHint: form.argumentHint.trim() || undefined,
          version: form.version.trim() || undefined,
          template,
          variables,
          metadata,
        };

        await this.aiPromptService.update(form.id, payload);
      } else {
        const payload: ICreateAiPromptRequestDto = {
          visibility: form.visibility,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          argumentHint: form.argumentHint.trim() || undefined,
          version: form.version.trim() || undefined,
          template,
          variables,
          metadata,
        };

        await this.aiPromptService.create(payload);
      }

      this.formOpen.set(false);
      await this.reload();
    } catch (error) {
      this.formError.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(prompt: IAiPromptResponseDto): Promise<void> {
    if (this.saving()) {
      return;
    }

    const confirmed = globalThis.confirm(
      `Delete prompt "${prompt.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      await this.aiPromptService.delete(prompt.id);
      if (this.editingId() === prompt.id) {
        this.closeForm();
      }
      await this.reload();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private toEditableJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value ?? '');
    }
  }

  private parseJson(value: string, field: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Field "${field}" is not valid JSON.`);
    }
  }

  private parseJsonArray<T>(value: string, field: string): T[] {
    const parsed = this.parseJson(value, field);
    if (!Array.isArray(parsed)) {
      throw new Error(`Field "${field}" must be a JSON array.`);
    }
    return parsed as T[];
  }

  private parseJsonObject(value: string, field: string): Record<string, unknown> {
    const parsed = this.parseJson(value, field);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Field "${field}" must be a JSON object.`);
    }
    return parsed as Record<string, unknown>;
  }

  private readErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      error.error &&
      typeof error.error === 'object'
    ) {
      return (
        (error.error as IProblemDetails).detail ||
        (error.error as IProblemDetails).title ||
        'Prompt request failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Prompt request failed.';
  }
}