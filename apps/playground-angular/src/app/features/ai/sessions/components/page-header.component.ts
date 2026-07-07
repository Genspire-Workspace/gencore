// file: apps\playground-angular\src\app\features\ai\sessions\components\page-header.component.ts

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-session-page-header',
  host: {
    class: 'block',
  },
  imports: [CommonModule],
  template: `
    <div class="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-primary">AI</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-base-content">
            Session playground
          </h1>
          <p class="mt-3 max-w-2xl text-sm text-base-content/60">
            Create one session, stream timeline turns from the backend, and navigate across saved
            sessions from the sidebar.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-2xl border border-base-300 px-4 py-3 text-sm font-medium text-base-content transition hover:border-base-content/40 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            (click)="refresh.emit()"
            [disabled]="loading() || sending()"
          >
            Refresh history
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly loading = input(false);
  readonly sending = input(false);
  readonly refresh = output<void>();
}