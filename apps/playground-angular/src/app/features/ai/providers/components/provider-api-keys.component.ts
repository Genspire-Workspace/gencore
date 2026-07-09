// file: apps/playground-angular/src/app/features/ai/providers/components/provider-api-keys.component.ts

import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, ViewContainerRef, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAiApiKeyResponseDto } from '@genspire/sdk-ai';
import { IconComponent } from '../../../../icons/icon.component';
import { OverlayService } from '../../../../shared/overlay';
import type { AppOverlayHandle } from '../../../../shared/overlay';

@Component({
  selector: 'app-ai-provider-api-keys',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="space-y-4 border-t border-base-300 pt-6">
      <div>
        <h4 class="font-semibold text-base-content">API Keys</h4>
        <p class="mt-1 text-sm text-base-content/60">
          Add provider API keys for the current account.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto]">
        <input
          class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="newName()"
          (ngModelChange)="newName.set($event)"
          placeholder="API key name"
        />
        <input
          class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="newValue()"
          (ngModelChange)="newValue.set($event)"
          placeholder="API key value"
        />
        <input
          class="rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="newEnv()"
          (ngModelChange)="newEnv.set($event)"
          placeholder="ENV"
        />
        <button
          class="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-accent-content transition hover:bg-accent/80"
          type="button"
          (click)="create.emit()"
          [disabled]="!newName().trim()"
        >
          Add Key
        </button>
      </div>

      @if (apiKeys().length === 0) {
        <div class="rounded-2xl border border-dashed border-base-300 px-4 py-4 text-sm text-base-content/60">
          No API keys configured.
        </div>
      } @else {
        <div class="space-y-2">
          @for (apiKey of apiKeys(); track apiKey.id) {
            <div class="rounded-2xl border border-base-300 bg-base px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium text-base-content">{{ apiKey.name }}</div>
                  <div class="mt-1 text-xs text-base-content/60">
                    {{ apiKey.valuePreview || 'Stored key' }}
                    @if (apiKey.env) {
                      <span> • {{ apiKey.env }}</span>
                    }
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    [ngClass]="{
                      'bg-success/15 text-success': apiKey.enabled,
                      'bg-base-200 text-base-content/60': !apiKey.enabled,
                    }"
                  >
                    {{ apiKey.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-base-content/40 transition hover:bg-base-200 hover:text-danger"
                    type="button"
                    (click)="openDeleteConfirmation(apiKey)"
                    aria-label="Delete {{ apiKey.name }}"
                  >
                    <app-icon iconName="close" size="sm" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <ng-template #deleteConfirmation let-overlay>
      <div class="w-[24rem] overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <div class="px-4 py-3">
          <h3 class="text-sm font-semibold text-base-content">Delete API Key</h3>
        </div>
        <div class="p-4">
          <p class="text-sm text-base-content/70">
            Are you sure you want to delete <strong class="text-base-content">{{ pendingDeleteKey()?.name }}</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div class="flex justify-end gap-2 px-4 py-3">
          <button
            class="rounded-xl border border-base-300 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-200"
            type="button"
            (click)="overlay.close()"
          >
            Cancel
          </button>
          <button
            class="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-danger-content transition hover:bg-danger/85"
            type="button"
            (click)="confirmDelete(overlay)"
          >
            Delete
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class ProviderApiKeysComponent {
  readonly apiKeys = input.required<IAiApiKeyResponseDto[]>();

  readonly newName = model('');
  readonly newValue = model('');
  readonly newEnv = model('');

  readonly create = output<void>();
  readonly delete = output<string>();

  @ViewChild('deleteConfirmation', { static: true })
  private readonly deleteConfirmationTemplate!: TemplateRef<unknown>;

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly pendingDeleteKey = signal<IAiApiKeyResponseDto | null>(null);

  read(): { name: string; value: string; env: string } {
    return {
      name: this.newName().trim(),
      value: this.newValue().trim(),
      env: this.newEnv().trim(),
    };
  }

  reset(): void {
    this.newName.set('');
    this.newValue.set('');
    this.newEnv.set('');
  }

  protected openDeleteConfirmation(apiKey: IAiApiKeyResponseDto): void {
    this.pendingDeleteKey.set(apiKey);
    this.overlayService.createModalTemplate(
      {
        templateRef: this.deleteConfirmationTemplate,
        viewContainerRef: this.viewContainerRef,
      },
      {
        panelClass: 'app-delete-confirmation-overlay',
      },
    );
  }

  protected confirmDelete(overlay: AppOverlayHandle): void {
    const key = this.pendingDeleteKey();
    if (key) {
      this.delete.emit(key.id);
    }
    this.pendingDeleteKey.set(null);
    overlay.close();
  }
}
