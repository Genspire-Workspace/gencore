// file: apps\playground-angular\src\app\features\files\files-page.component.ts

import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { IconComponent } from '../../icons/icon.component';
import { FileService } from './file.service';
import type { IProblemDetails } from '../../core/problem-details';
import type { IFileResponse } from './file-types';

@Component({
  selector: 'app-files-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, IconComponent],
  template: `
    <section class="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div class="rounded-3xl border border-base-300 bg-base-100 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <input
            class="min-w-0 flex-1 rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-content hover:file:bg-accent/80"
            type="file"
            multiple
            (change)="onFileSelected($event)"
          />

          <button
            class="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-content transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-base-300"
            type="button"
            (click)="upload()"
            [disabled]="uploading() || selectedFiles().length === 0"
          >
            {{ uploading() ? 'Uploading...' : 'Upload' }}
          </button>
        </div>

        @if (selectedFiles().length > 0) {
          <div class="mt-3 flex flex-wrap gap-2">
            @for (file of selectedFiles(); track file.name + file.size) {
              <span class="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5 text-xs font-medium text-base-content">
                {{ file.name }}
                <button
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full text-base-content/60 transition hover:bg-base-300 hover:text-base-content"
                  type="button"
                  (click)="removeSelectedFile(file)"
                  aria-label="Remove {{ file.name }}"
                >
                  <app-icon iconName="close" size="sm" aria-hidden="true" />
                </button>
              </span>
            }
          </div>
        }

        @if (uploadMessage()) {
          <div
            class="mt-3 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
          >
            {{ uploadMessage() }}
          </div>
        }

        @if (error()) {
          <div
            class="mt-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {{ error() }}
          </div>
        }
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-base-content">Stored files</h2>
            <button
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base-300 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="loadFiles()"
              [disabled]="loading()"
              aria-label="Refresh files"
              title="Refresh files"
            >
              <app-icon iconName="refresh" size="sm" aria-hidden="true" />
            </button>
          </div>
          <span
            class="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70"
          >
            {{ files().length }} item{{ files().length === 1 ? '' : 's' }}
          </span>
        </div>

        @if (files().length === 0 && !loading()) {
          <div
            class="mt-6 rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center text-sm text-base-content/60"
          >
            No files uploaded yet.
          </div>
        } @else {
          <div class="mt-6 min-h-0 flex-1 overflow-auto rounded-2xl border border-base-300">
            <table class="min-w-full divide-y divide-base-300 text-left text-sm">
              <thead class="sticky top-0 bg-base-200 text-base-content/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Size</th>
                  <th class="px-4 py-3 font-medium">Created</th>
                  <th class="px-4 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-200 bg-base-100">
                @for (file of files(); track file.id) {
                  <tr class="align-top">
                    <td class="px-4 py-4">
                      <div class="flex items-start gap-3">
                        @if (isImage(file)) {
                          @if (previewUrl(file); as previewSrc) {
                            <img
                              class="h-12 w-12 shrink-0 rounded-lg border border-base-300 object-cover"
                              [src]="previewSrc"
                              [alt]="file.originalName"
                              loading="lazy"
                            />
                          } @else {
                            <span
                              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200 text-base-content/40"
                            >
                              <app-icon iconName="description" size="md" aria-hidden="true" />
                            </span>
                          }
                        } @else {
                          <span
                            class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200 text-base-content/40"
                          >
                            <app-icon iconName="description" size="md" aria-hidden="true" />
                          </span>
                        }
                        <div class="min-w-0">
                          <div class="font-medium text-base-content">
                            {{ file.originalName }}
                          </div>
                          <div class="mt-1 text-xs text-base-content/60">
                            {{ file.bucket }}/{{ file.key }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4 text-base-content/70">
                      {{ formatBytes(file.size) }}
                    </td>
                    <td class="px-4 py-4 text-base-content/70">
                      {{ formatDate(file.createdAt) }}
                    </td>
                    <td class="px-4 py-4">
                      <button
                        class="text-sm font-medium text-primary hover:text-primary/80"
                        type="button"
                        (click)="openFile(file)"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class FilesPageComponent implements OnDestroy {
  private readonly fileService = inject(FileService);
  private readonly previewUrls = new Map<string, string>();

  protected readonly files = signal<IFileResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly uploadMessage = signal('');
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly previewUrlById = signal<Record<string, string>>({});

  constructor() {
    void this.loadFiles();
  }

  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  protected async loadFiles(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await this.fileService.listFiles();
      this.files.set(response.items);
      void this.loadPreviewUrls(response.items);
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) {
      return;
    }

    this.selectedFiles.update((current) => [...current, ...Array.from(files)]);
    this.uploadMessage.set('');
    this.error.set('');

    if (input) {
      input.value = '';
    }
  }

  protected removeSelectedFile(file: File): void {
    this.selectedFiles.update((current) =>
      current.filter((item) => item.name !== file.name || item.size !== file.size),
    );
  }

  protected async upload(): Promise<void> {
    const files = this.selectedFiles();
    if (files.length === 0) {
      return;
    }

    this.uploading.set(true);
    this.error.set('');
    this.uploadMessage.set('');

    let succeeded = 0;
    let failed = 0;

    for (const file of files) {
      try {
        await this.fileService.uploadFile(file);
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }

    this.uploadMessage.set(
      failed === 0
        ? `Uploaded ${succeeded} file${succeeded === 1 ? '' : 's'}.`
        : `Uploaded ${succeeded}, failed ${failed}.`,
    );

    this.error.set(
      failed === 0
        ? ''
        : `${failed} file${failed === 1 ? '' : 's'} failed to upload.`,
    );

    this.selectedFiles.set([]);
    await this.loadFiles();
    this.uploading.set(false);
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

  protected isImage(file: IFileResponse): boolean {
    return (file.contentType ?? '').startsWith('image/');
  }

  protected previewUrl(file: IFileResponse): string | null {
    return this.previewUrlById()[file.id] ?? null;
  }

  protected async openFile(file: IFileResponse): Promise<void> {
    try {
      const blob = await this.fileService.downloadFile(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.click();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    }
  }

  private async loadPreviewUrls(files: IFileResponse[]): Promise<void> {
    this.clearPreviewUrls();

    const imageFiles = files.filter((file) => this.isImage(file));
    if (imageFiles.length === 0) {
      return;
    }

    const previewEntries = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const blob = await this.fileService.downloadFile(file.id);
          return [file.id, URL.createObjectURL(blob)] as const;
        } catch {
          return null;
        }
      }),
    );

    const nextPreviewUrlById: Record<string, string> = {};
    for (const entry of previewEntries) {
      if (!entry) {
        continue;
      }

      const [fileId, objectUrl] = entry;
      this.previewUrls.set(fileId, objectUrl);
      nextPreviewUrlById[fileId] = objectUrl;
    }

    this.previewUrlById.set(nextPreviewUrlById);
  }

  private clearPreviewUrls(): void {
    for (const objectUrl of this.previewUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }

    this.previewUrls.clear();
    this.previewUrlById.set({});
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
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
