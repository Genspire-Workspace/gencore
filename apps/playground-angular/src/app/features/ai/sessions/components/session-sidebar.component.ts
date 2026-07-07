// file: apps\playground-angular\src\app\features\ai\sessions\components\session-sidebar.component.ts

import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionListComponent } from './session-list.component';
import { SessionConfigFormComponent } from './session-config-form.component';
import { StatusBannerComponent } from './status-banner.component';
import type { IAiSessionResponse } from '../ai-session-types';

@Component({
  selector: 'app-ai-session-sidebar',
  host: {
    class:
      'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm',
  },
  imports: [CommonModule, SessionListComponent, SessionConfigFormComponent, StatusBannerComponent],
  template: `
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-base-content">Sessions</h2>
      <span
        class="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70"
      >
        {{ sessions().length }}
      </span>
    </div>

    <div class="mt-4 space-y-3">
      <button
        class="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-accent-content transition hover:bg-accent/80 disabled:cursor-not-allowed disabled:bg-base-300"
        type="button"
        (click)="newSession.emit()"
        [disabled]="loading() || sending()"
      >
        New session
      </button>

      <button
        class="w-full rounded-2xl border border-base-300 px-4 py-3 text-sm font-medium text-base-content transition hover:border-base-content/40 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        (click)="refreshList.emit()"
        [disabled]="loading() || sending()"
      >
        Refresh sessions
      </button>
    </div>

    <app-ai-session-list
      [sessions]="sessions()"
      [activeSessionId]="activeSessionId()"
      [loading]="loading()"
      [sending]="sending()"
      (open)="openSession.emit($event)"
    />

    <app-ai-session-config-form [(provider)]="provider" [(model)]="model" />

    <app-ai-status-banner [message]="streamStatus()" severity="info" />
    <app-ai-status-banner [message]="error()" severity="danger" />
  `,
})
export class SessionSidebarComponent {
  readonly sessions = input.required<IAiSessionResponse[]>();
  readonly activeSessionId = input<string | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);
  readonly streamStatus = input('');
  readonly error = input('');

  readonly provider = model('');
  readonly model = model('');

  readonly newSession = output<void>();
  readonly refreshList = output<void>();
  readonly openSession = output<string>();
}