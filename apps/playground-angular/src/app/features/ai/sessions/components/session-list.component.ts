// file: apps/playground-angular/src/app/features/ai/sessions/components/session-list.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../../../icons/icon.component';
import type { IAiSessionResponse } from '../ai-session-types';

@Component({
  selector: 'app-ai-session-list',
  host: {
    class: 'block min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, IconComponent],
  template: `
    @if (sessions().length === 0 && !loading()) {
      <div
        class="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60"
      >
        No sessions yet.
      </div>
    } @else {
      <div class="h-full flex flex-col gap-2 overflow-y-auto">
        @for (item of sessions(); track item.id) {
          <div class="group relative">
            <button
              class="block w-full rounded-2xl border px-4 py-3 pr-14 text-left transition"
              [ngClass]="{
                'border-primary bg-primary/10 text-primary': item.id === activeSessionId(),
                'border-base-300 bg-base-100 text-base-content': item.id !== activeSessionId(),
              }"
              type="button"
              (click)="open.emit(item.id)"
              [disabled]="loading()"
            >
              <div class="text-sm font-semibold">
                {{ item.title || 'Untitled session' }}
              </div>
              <div class="mt-1 text-xs text-base-content/60">
                {{ readProvider(item) || 'provider?' }} /
                {{ readModel(item) || 'model?' }}
              </div>
            </button>

            <button
              class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral opacity-0 transition hover:bg-base-300 focus:opacity-100 focus:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
              type="button"
              (click)="configure.emit(item.id); $event.stopPropagation()"
              [disabled]="loading() || sending()"
              aria-label="Session settings"
              title="Session settings"
            >
              <app-icon iconName="more_vert" size="sm" aria-hidden="true" />
            </button>
          </div>
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
  readonly configure = output<string>();

  readProvider(session: IAiSessionResponse): string {
    const settings = session.settings as { provider?: string } | undefined;
    return settings?.provider || '';
  }

  readModel(session: IAiSessionResponse): string {
    const settings = session.settings as { model?: string } | undefined;
    return settings?.model || '';
  }
}
