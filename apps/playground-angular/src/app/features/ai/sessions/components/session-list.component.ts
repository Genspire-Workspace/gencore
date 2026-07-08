// file: apps\playground-angular\src\app\features\ai\sessions\components\session-list.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../icons/icon.component';
import { OverlayService } from '../../../../shared/overlay';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import type { IAiSessionResponse } from '../ai-session-types';

@Component({
  selector: 'app-ai-session-list',
  host: {
    class: 'block min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule, IconComponent],
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
              [class.border-primary]="item.id === activeSessionId()"
              [class.bg-base-200]="item.id === activeSessionId()"
              [class.text-primary]="item.id === activeSessionId()"
              [class.border-base-300]="item.id !== activeSessionId()"
              [class.bg-base-100]="item.id !== activeSessionId()"
              [class.text-base-content]="item.id !== activeSessionId()"
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
              #optionsTrigger
              class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral opacity-0 transition hover:bg-base-300 focus:opacity-100 focus:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
              type="button"
              (click)="openOptions($event, item, optionsTrigger)"
              [disabled]="loading() || sending()"
              aria-label="Session options"
              title="Session options"
            >
              <app-icon iconName="more_vert" size="sm" aria-hidden="true" />
            </button>
          </div>
        }
      </div>
    }

    <ng-template #optionsMenu let-overlay let-data="data">
      <div class="min-w-44 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
        <button
          class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-base-content transition hover:bg-base-300"
          type="button"
          (click)="openRenameModal(data.session, overlay)"
        >
          Rename
        </button>
        <button
          class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-base-content transition hover:bg-base-300"
          type="button"
          (click)="openSettings(data.session.id, overlay)"
        >
          Settings
        </button>
        <button
          class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/10"
          type="button"
          (click)="openDeleteModal(data.session, overlay)"
        >
          Delete
        </button>
      </div>
    </ng-template>

    <ng-template #renameModal let-overlay>
      <div class="w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-base-content">Rename Session</h3>
        <p class="mt-1 text-sm text-base-content/60">
          Update the session title.
        </p>

        <label class="mt-5 block space-y-2">
          <span class="text-sm font-medium text-base-content/80">Title</span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="renameTitle()"
            (ngModelChange)="renameTitle.set($event)"
          />
        </label>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
            type="button"
            (click)="confirmRename(overlay)"
          >
            Save
          </button>
        </div>
      </div>
    </ng-template>

    <ng-template #deleteModal let-overlay>
      <div class="w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-base-content">Delete Session</h3>
        <p class="mt-2 text-sm text-base-content/60">
          Delete
          <span class="font-medium text-base-content">{{ pendingSessionTitle() || 'this session' }}</span>?
          This action cannot be undone.
        </p>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-2xl bg-danger px-4 py-2.5 text-sm font-medium text-danger-content transition hover:bg-danger/80"
            type="button"
            (click)="confirmDelete(overlay)"
          >
            Confirm
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class SessionListComponent {
  readonly sessions = input.required<IAiSessionResponse[]>();
  readonly activeSessionId = input<string | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);

  readonly open = output<string>();
  readonly configure = output<string>();
  readonly rename = output<{ sessionId: string; title: string }>();
  readonly delete = output<string>();

  @ViewChild('optionsMenu', { static: true })
  private readonly optionsMenuTemplate!: TemplateRef<unknown>;

  @ViewChild('renameModal', { static: true })
  private readonly renameModalTemplate!: TemplateRef<unknown>;

  @ViewChild('deleteModal', { static: true })
  private readonly deleteModalTemplate!: TemplateRef<unknown>;

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly renameTitle = signal('');
  protected readonly pendingSessionId = signal<string | null>(null);
  protected readonly pendingSessionTitle = signal('');

  private activeOptionsHandle: AppOverlayHandle | null = null;
  private activeModalHandle: AppOverlayHandle | null = null;

  openOptions(event: MouseEvent, session: IAiSessionResponse, origin: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();

    this.activeOptionsHandle?.close();

    const handle = this.overlayService.createDropdownTemplate(
      {
        templateRef: this.optionsMenuTemplate,
        viewContainerRef: this.viewContainerRef,
        data: { session },
      },
      {
        origin,
        hasBackdrop: true,
        panelClass: 'app-session-options-overlay',
      },
    );

    this.activeOptionsHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeOptionsHandle?.id === handle.id) {
        this.activeOptionsHandle = null;
      }
    });
  }

  readProvider(session: IAiSessionResponse): string {
    const settings = session.settings as { provider?: string } | undefined;
    return settings?.provider || '';
  }

  readModel(session: IAiSessionResponse): string {
    const settings = session.settings as { model?: string } | undefined;
    return settings?.model || '';
  }

  protected openSettings(sessionId: string, overlay: AppOverlayHandle): void {
    overlay.close();
    this.configure.emit(sessionId);
  }

  protected openRenameModal(session: IAiSessionResponse, overlay: AppOverlayHandle): void {
    overlay.close();
    this.pendingSessionId.set(session.id);
    this.pendingSessionTitle.set(session.title || 'Untitled session');
    this.renameTitle.set(session.title || '');
    this.openModal(this.renameModalTemplate);
  }

  protected openDeleteModal(session: IAiSessionResponse, overlay: AppOverlayHandle): void {
    overlay.close();
    this.pendingSessionId.set(session.id);
    this.pendingSessionTitle.set(session.title || 'Untitled session');
    this.openModal(this.deleteModalTemplate);
  }

  protected confirmRename(overlay: AppOverlayHandle): void {
    const sessionId = this.pendingSessionId();
    if (!sessionId) {
      return;
    }

    this.rename.emit({
      sessionId,
      title: this.renameTitle(),
    });
    overlay.close();
    this.resetPendingSession();
  }

  protected confirmDelete(overlay: AppOverlayHandle): void {
    const sessionId = this.pendingSessionId();
    if (!sessionId) {
      return;
    }

    this.delete.emit(sessionId);
    overlay.close();
    this.resetPendingSession();
  }

  private openModal(templateRef: TemplateRef<unknown>): void {
    this.activeModalHandle?.close();

    const handle = this.overlayService.createModalTemplate(
      {
        templateRef,
        viewContainerRef: this.viewContainerRef,
      },
      {
        panelClass: 'app-session-modal-overlay',
        width: 'auto',
      },
    );

    this.activeModalHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeModalHandle?.id === handle.id) {
        this.activeModalHandle = null;
      }

      this.resetPendingSession();
    });
  }

  private resetPendingSession(): void {
    this.pendingSessionId.set(null);
    this.pendingSessionTitle.set('');
    this.renameTitle.set('');
  }
}
