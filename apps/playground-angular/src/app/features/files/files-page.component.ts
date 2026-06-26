import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FileService } from './file.service';
import type { IProblemDetails } from '../../core/problem-details';
import type { IFileResponse } from './file-types';

@Component({
  selector: 'app-files-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            Storage
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Files
          </h1>
          <p class="mt-3 max-w-2xl text-sm text-slate-500">
            Upload a file to the playground bucket and inspect the metadata
            returned by the API.
          </p>
        </div>

        <button
          class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          (click)="loadFiles()"
          [disabled]="loading()"
        >
          {{ loading() ? 'Refreshing...' : 'Refresh list' }}
        </button>
      </div>

      <div class="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Upload file</h2>
          <p class="mt-2 text-sm text-slate-500">
            Send a multipart upload directly to <code>/file</code>.
          </p>

          <div class="mt-6 space-y-4">
            <input
              class="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
              type="file"
              (change)="onFileSelected($event)"
            />

            <button
              class="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              type="button"
              (click)="upload()"
              [disabled]="uploading() || !selectedFile()"
            >
              {{ uploading() ? 'Uploading...' : 'Upload selected file' }}
            </button>
          </div>

          @if (uploadMessage()) {
            <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {{ uploadMessage() }}
            </div>
          }

          @if (error()) {
            <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ error() }}
            </div>
          }
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-semibold text-slate-900">Stored files</h2>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {{ files().length }} item{{ files().length === 1 ? '' : 's' }}
            </span>
          </div>

          @if (files().length === 0 && !loading()) {
            <div class="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              No files uploaded yet.
            </div>
          } @else {
            <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="px-4 py-3 font-medium">Name</th>
                    <th class="px-4 py-3 font-medium">Size</th>
                    <th class="px-4 py-3 font-medium">Created</th>
                    <th class="px-4 py-3 font-medium">Open</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (file of files(); track file.id) {
                    <tr class="align-top">
                      <td class="px-4 py-4">
                        <div class="font-medium text-slate-900">
                          {{ file.originalName }}
                        </div>
                        <div class="mt-1 text-xs text-slate-500">
                          {{ file.bucket }}/{{ file.key }}
                        </div>
                      </td>
                      <td class="px-4 py-4 text-slate-600">
                        {{ formatBytes(file.size) }}
                      </td>
                      <td class="px-4 py-4 text-slate-600">
                        {{ formatDate(file.createdAt) }}
                      </td>
                      <td class="px-4 py-4">
                        <a
                          class="text-sm font-medium text-sky-700 hover:text-sky-800"
                          [href]="downloadUrl(file)"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class FilesPageComponent {
  private readonly fileService = inject(FileService);

  protected readonly files = signal<IFileResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly uploadMessage = signal('');
  protected readonly selectedFile = signal<File | null>(null);

  constructor() {
    void this.loadFiles();
  }

  protected async loadFiles(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await this.fileService.listFiles();
      this.files.set(response.items);
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.selectedFile.set(input?.files?.[0] ?? null);
    this.uploadMessage.set('');
    this.error.set('');
  }

  protected async upload(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.error.set('');
    this.uploadMessage.set('');

    try {
      const uploaded = await this.fileService.uploadFile(file);
      this.uploadMessage.set(`Uploaded ${uploaded.originalName}.`);
      this.selectedFile.set(null);
      await this.loadFiles();
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.uploading.set(false);
    }
  }

  protected formatBytes(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = size / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
  }

  protected formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }

  protected downloadUrl(file: IFileResponse): string {
    return this.fileService.createDownloadUrl(file.id);
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
        'File request failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'File request failed.';
  }
}
