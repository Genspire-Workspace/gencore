// file: apps\playground-angular\src\app\features\ai\sessions\components\session-sidebar.component.ts

import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../icons/icon.component';
import { SessionListComponent } from './session-list.component';
import type { IAiSessionResponse } from '../ai-session-types';

@Component({
  selector: 'app-ai-session-sidebar',
  host: {
    class:
      'flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-4',
  },
  imports: [CommonModule, FormsModule, IconComponent, SessionListComponent],
  template: `
    <div class="flex items-center gap-2">
      <label class="relative min-w-0 flex-1">
        <span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-base-content/40">
          <app-icon iconName="search" size="sm" aria-hidden="true" />
        </span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base px-10 py-2.5 text-sm text-base-content outline-none transition focus:border-primary"
          type="search"
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event)"
          placeholder="Search sessions"
        />
      </label>

      <button
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-base-300 bg-base text-base-content transition hover:border-base-content/30 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        (click)="refreshList.emit()"
        [disabled]="loading() || sending()"
        aria-label="Refresh sessions"
        title="Refresh sessions"
      >
        <app-icon iconName="refresh" size="sm" aria-hidden="true" />
      </button>

      <button
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-content transition hover:bg-accent/80 disabled:cursor-not-allowed disabled:bg-base-300 disabled:text-base-content/50"
        type="button"
        (click)="newSession.emit()"
        [disabled]="loading() || sending()"
        aria-label="New session"
        title="New session"
      >
        <app-icon iconName="add" size="sm" aria-hidden="true" />
      </button>
    </div>

    <app-ai-session-list
      [sessions]="filteredSessions()"
      [activeSessionId]="activeSessionId()"
      [loading]="loading()"
      [sending]="sending()"
      (open)="openSession.emit($event)"
      (configure)="configureSession.emit($event)"
    />
  `,
})
export class SessionSidebarComponent {
  readonly sessions = input.required<IAiSessionResponse[]>();
  readonly activeSessionId = input<string | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);

  readonly searchTerm = model('');

  readonly newSession = output<void>();
  readonly refreshList = output<void>();
  readonly openSession = output<string>();
  readonly configureSession = output<string>();

  protected readonly filteredSessions = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const sessions = this.sessions();

    if (!query) {
      return sessions;
    }

    return sessions.filter((session) => {
      const title = (session.title || 'Untitled session').toLowerCase();
      const id = session.id.toLowerCase();
      const settings = session.settings as { provider?: string; model?: string } | undefined;
      const provider = (settings?.provider || '').toLowerCase();
      const model = (settings?.model || '').toLowerCase();

      return title.includes(query)
        || id.includes(query)
        || provider.includes(query)
        || model.includes(query);
    });
  });
}
