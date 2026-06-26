// file: apps\playground-angular\src\app\features\ai\skills\ai-skill-page.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AiSkillService } from './ai-skill.service';
import type {
  AiSkillExecutionModeDto,
  AiSkillVisibilityDto,
  IAiSkillResponseDto,
  ICreateAiSkillRequestDto,
  IUpdateAiSkillRequestDto,
} from './ai-skill.types';
import type { IProblemDetails } from '../../../core/problem-details';

interface ISkillFormState {
  id: string | null;
  visibility: AiSkillVisibilityDto;
  name: string;
  description: string;
  instructions: string;
  compatibility: string;
  license: string;
  executionMode: AiSkillExecutionModeDto;
  allowedTools: string;
  serverToolNames: string;
  disableModelInvocation: boolean;
  metadata: string;
}

const EMPTY_FORM: ISkillFormState = {
  id: null,
  visibility: 'private',
  name: '',
  description: '',
  instructions: '',
  compatibility: '',
  license: '',
  executionMode: 'server',
  allowedTools: '',
  serverToolNames: '',
  disableModelInvocation: false,
  metadata: '',
};

@Component({
  selector: 'app-ai-skill-page',
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
              Skills
            </h1>
            <p class="mt-3 max-w-2xl text-sm text-slate-500">
              Create, edit, import and remove managed AI skills that can be
              referenced from AI sessions.
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
              class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="openImportPanel()"
              [disabled]="loading() || saving()"
            >
              Import zip
            </button>
            <button
              class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              (click)="openCreate()"
              [disabled]="loading() || saving()"
            >
              New skill
            </button>
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="mt-4 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ error() }}
        </div>
      }

      @if (importOpen()) {
        <div class="mt-4 shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-900">Import skill bundle</h2>
            <button
              class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              type="button"
              (click)="closeImport()"
            >
              Close
            </button>
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">Visibility</span>
              <select
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                [ngModel]="importVisibility()"
                (ngModelChange)="importVisibility.set($event)"
                name="importVisibility"
              >
                <option value="private">private</option>
                <option value="shared">shared</option>
                <option value="system">system</option>
              </select>
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">Description (optional override)</span>
              <input
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                type="text"
                [ngModel]="importDescription()"
                (ngModelChange)="importDescription.set($event)"
                name="importDescription"
              />
            </label>
          </div>

          <label class="mt-4 block space-y-2">
            <span class="text-sm font-medium text-slate-700">Skill zip bundle (must contain SKILL.md)</span>
            <input
              class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
              type="file"
              accept=".zip,application/zip"
              (change)="onImportFileSelected($event)"
            />
            @if (importFile()) {
              <span class="text-xs text-slate-500">
                Selected: {{ importFile()!.name }} ({{ importFile()!.size }} bytes)
              </span>
            }
          </label>

          <div class="mt-4 flex items-center justify-end gap-3">
            <button
              class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              type="button"
              (click)="closeImport()"
            >
              Cancel
            </button>
            <button
              class="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              type="button"
              (click)="submitImport()"
              [disabled]="saving() || !importFile()"
            >
              {{ saving() ? 'Importing...' : 'Import bundle' }}
            </button>
          </div>

          @if (importError()) {
            <p class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ importError() }}
            </p>
          }
        </div>
      }

      <div class="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          @if (loading() && skills().length === 0) {
            <div class="flex flex-1 items-center justify-center text-sm text-slate-500">
              Loading skills...
            </div>
          } @else if (skills().length === 0) {
            <div class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              No skills yet. Create or import one to get started.
            </div>
          } @else {
            <div class="h-full space-y-3 overflow-y-auto pr-2">
              @for (skill of skills(); track skill.id) {
                <article
                  class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                  [class.border-sky-300]="editingId() === skill.id"
                  [class.bg-sky-50]="editingId() === skill.id"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                          {{ skill.visibility }}
                        </span>
                        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {{ skill.executionMode }}
                        </span>
                        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {{ skill.bundleFormat }}
                        </span>
                        @if (skill.registered) {
                          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700">
                            registered
                          </span>
                        } @else {
                          <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-700">
                            unregistered
                          </span>
                        }
                        <h3 class="truncate text-base font-semibold text-slate-900">
                          {{ skill.name }}
                        </h3>
                      </div>
                      <p class="mt-1 text-sm text-slate-600">{{ skill.description }}</p>
                      @if (skill.instructions) {
                        <p class="mt-1 text-xs text-slate-500">instructions: {{ skill.instructions }}</p>
                      }
                      @if (skill.allowedTools && skill.allowedTools.length > 0) {
                        <p class="mt-1 text-xs text-slate-400">tools: {{ skill.allowedTools.join(', ') }}</p>
                      }
                      <p class="mt-2 break-all text-[11px] text-slate-400">{{ skill.id }}</p>
                    </div>

                    <div class="flex shrink-0 flex-wrap gap-2">
                      <button
                        class="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        (click)="toggleRegistered(skill)"
                        [disabled]="saving()"
                      >
                        {{ skill.registered ? 'Unregister' : 'Register' }}
                      </button>
                      @if (skill.bundleFormat === 'zip' && skill.bundleStorageFileId) {
                        <button
                          class="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          (click)="download(skill)"
                          [disabled]="saving()"
                        >
                          Download
                        </button>
                      }
                      <button
                        class="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        (click)="openEdit(skill)"
                        [disabled]="saving()"
                      >
                        Edit
                      </button>
                      <button
                        class="rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        (click)="remove(skill)"
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
            class="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[30rem]"
            (ngSubmit)="save()"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold text-slate-900">
                {{ form().id ? 'Edit skill' : 'New skill' }}
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
                <span class="text-sm font-medium text-slate-700">Description</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().description"
                  (ngModelChange)="patchForm('description', $event)"
                  name="description"
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
                <span class="text-sm font-medium text-slate-700">Execution mode</span>
                <select
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().executionMode"
                  (ngModelChange)="patchForm('executionMode', $event)"
                  name="executionMode"
                >
                  <option value="server">server</option>
                  <option value="client">client</option>
                </select>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Instructions</span>
                <textarea
                  class="min-h-28 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  [ngModel]="form().instructions"
                  (ngModelChange)="patchForm('instructions', $event)"
                  name="instructions"
                ></textarea>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Compatibility</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().compatibility"
                  (ngModelChange)="patchForm('compatibility', $event)"
                  name="compatibility"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">License</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().license"
                  (ngModelChange)="patchForm('license', $event)"
                  name="license"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Allowed tools (comma separated)</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().allowedTools"
                  (ngModelChange)="patchForm('allowedTools', $event)"
                  name="allowedTools"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">Server tool names (comma separated, server skills only)</span>
                <input
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
                  type="text"
                  [ngModel]="form().serverToolNames"
                  (ngModelChange)="patchForm('serverToolNames', $event)"
                  name="serverToolNames"
                />
              </label>

              <label class="flex items-center gap-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  [ngModel]="form().disableModelInvocation"
                  (ngModelChange)="patchForm('disableModelInvocation', $event)"
                  name="disableModelInvocation"
                />
                <span class="text-sm font-medium text-slate-700">Disable model invocation</span>
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
                  [disabled]="saving() || !form().name.trim() || !form().description.trim()"
                >
                  {{ saving() ? 'Saving...' : 'Save skill' }}
                </button>
              </div>
            </div>
          </form>
        }
      </div>
    </section>
  `,
})
export class AiSkillPageComponent {
  private readonly aiSkillService = inject(AiSkillService);

  protected readonly skills = signal<IAiSkillResponseDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formOpen = signal(false);
  protected readonly formError = signal('');
  protected readonly form = signal<ISkillFormState>({ ...EMPTY_FORM });
  protected readonly editingId = signal<string | null>(null);

  protected readonly importOpen = signal(false);
  protected readonly importFile = signal<File | null>(null);
  protected readonly importVisibility = signal<AiSkillVisibilityDto>('private');
  protected readonly importDescription = signal('');
  protected readonly importError = signal('');

  constructor() {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      this.skills.set(await this.aiSkillService.list());
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

  protected openEdit(skill: IAiSkillResponseDto): void {
    this.editingId.set(skill.id);
    this.form.set({
      id: skill.id,
      visibility: skill.visibility,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions ?? '',
      compatibility: skill.compatibility ?? '',
      license: skill.license ?? '',
      executionMode: skill.executionMode,
      allowedTools: skill.allowedTools?.join(', ') ?? '',
      serverToolNames: this.readServerToolNames(skill),
      disableModelInvocation: skill.disableModelInvocation,
      metadata: skill.metadata ? this.toEditableJson(skill.metadata) : '',
    });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formError.set('');
  }

  protected patchForm<TKey extends keyof ISkillFormState>(
    key: TKey,
    value: ISkillFormState[TKey],
  ): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  protected async save(): Promise<void> {
    const form = this.form();
    if (!form.name.trim() || !form.description.trim() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      const allowedTools = this.parseCommaList(form.allowedTools);
      const serverToolNames = this.parseCommaList(form.serverToolNames);
      const metadata = form.metadata.trim()
        ? this.parseJsonObject(form.metadata, 'metadata')
        : undefined;

      if (form.id) {
        const payload: IUpdateAiSkillRequestDto = {
          visibility: form.visibility,
          name: form.name.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim() || undefined,
          compatibility: form.compatibility.trim() || undefined,
          license: form.license.trim() || undefined,
          executionMode: form.executionMode,
          allowedTools: allowedTools.length ? allowedTools : undefined,
          serverToolNames: serverToolNames.length ? serverToolNames : undefined,
          disableModelInvocation: form.disableModelInvocation,
          metadata,
        };

        await this.aiSkillService.update(form.id, payload);
      } else {
        const payload: ICreateAiSkillRequestDto = {
          visibility: form.visibility,
          name: form.name.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim() || undefined,
          compatibility: form.compatibility.trim() || undefined,
          license: form.license.trim() || undefined,
          executionMode: form.executionMode,
          bundleFormat: 'inline',
          allowedTools: allowedTools.length ? allowedTools : undefined,
          serverToolNames: serverToolNames.length ? serverToolNames : undefined,
          disableModelInvocation: form.disableModelInvocation,
          metadata,
        };

        await this.aiSkillService.create(payload);
      }

      this.formOpen.set(false);
      await this.reload();
    } catch (error) {
      this.formError.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(skill: IAiSkillResponseDto): Promise<void> {
    if (this.saving()) {
      return;
    }

    const confirmed = globalThis.confirm(
      `Delete skill "${skill.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      await this.aiSkillService.delete(skill.id);
      if (this.editingId() === skill.id) {
        this.closeForm();
      }
      await this.reload();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleRegistered(skill: IAiSkillResponseDto): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      await this.aiSkillService.setRegistered(skill.id, !skill.registered);
      await this.reload();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async download(skill: IAiSkillResponseDto): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      const info = await this.aiSkillService.getDownloadInfo(skill.id);
      if (!info) {
        this.error.set('No downloadable bundle for this skill.');
        return;
      }

      globalThis.open(info.downloadPath, '_blank');
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected openImportPanel(): void {
    this.importOpen.set(true);
    this.importFile.set(null);
    this.importVisibility.set('private');
    this.importDescription.set('');
    this.importError.set('');
  }

  protected closeImport(): void {
    this.importOpen.set(false);
    this.importError.set('');
  }

  protected onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.importFile.set(file);
    }
  }

  protected async submitImport(): Promise<void> {
    const file = this.importFile();
    if (!file || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.importError.set('');

    try {
      await this.aiSkillService.importZipBundle({
        file,
        visibility: this.importVisibility(),
        description: this.importDescription().trim() || undefined,
      });
      this.closeImport();
      await this.reload();
    } catch (error) {
      this.importError.set(this.readErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private readServerToolNames(skill: IAiSkillResponseDto): string {
    const fromManifest = skill.manifest?.['serverToolNames'];
    if (Array.isArray(fromManifest)) {
      return fromManifest.filter((v): v is string => typeof v === 'string').join(', ');
    }
    return '';
  }

  private parseCommaList(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private toEditableJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value ?? '');
    }
  }

  private parseJsonObject(value: string, field: string): Record<string, unknown> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Field "${field}" is not valid JSON.`);
    }

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
        'Skill request failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Skill request failed.';
  }
}