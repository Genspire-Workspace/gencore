// file: apps\playground-angular\src\app\features\ai\sessions\components\session-list.component.ts

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { IAiSessionResponse } from '../ai-session-types';

@Component({
  selector: 'app-ai-session-list',
  host: {
    class: 'block mt-6 min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule],
  template: `
    @if (sessions().length === 0 && !loading()) {
      <div
        class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60"
      >
        No sessions yet.
      </div>
    } @else {
      <div class="h-full space-y-3 overflow-y-auto pr-2">
        @for (item of sessions(); track item.id) {
          <button
            class="block w-full rounded-2xl border px-4 py-3 text-left transition"
            [class.border-primary]="item.id === activeSessionId()"
            [class.bg-base-200]="item.id === activeSessionId()"
            [class.text-primary]="item.id === activeSessionId()"
            [class.border-base-300]="item.id !== activeSessionId()"
            [class.bg-base-100]="item.id !== activeSessionId()"
            [class.text-base-content]="item.id !== activeSessionId()"
            type="button"
            (click)="open.emit(item.id)"
            [disabled]="sending()"
          >
            <div class="text-sm font-semibold">
              {{ item.title || 'Untitled session' }}
            </div>
            <div class="mt-1 text-xs text-base-content/60">
              {{ readProvider(item) || 'provider?' }} /
              {{ readModel(item) || 'model?' }}
            </div>
            <div class="mt-2 break-all text-[11px] text-base-content/40">
              {{ item.id }}
            </div>
          </button>
        }
      </div>
    }
  `,
})
export class SessionListComponent {
  readonly sessions = input.required<IAiSessionResponse[]>();
  readonly activeSessionId = input<string | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);

  readonly open = output<string>();

  readProvider(session: IAiSessionResponse): string {
    const settings = session.settings as { provider?: string } | undefined;
    return settings?.provider || '';
  }

  readModel(session: IAiSessionResponse): string {
    const settings = session.settings as { model?: string } | undefined;
    return settings?.model || '';
  }
}