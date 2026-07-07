// file: apps\playground-angular\src\app\features\ai\sessions\components\session-config-form.component.ts

import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-session-config-form',
  host: {
    class: 'block mt-8 shrink-0 border-t border-base-300 pt-6',
  },
  imports: [CommonModule, FormsModule],
  template: `
    <h3 class="text-lg font-semibold text-base-content">Session config</h3>

    <div class="mt-6 space-y-4">
      <label class="block space-y-2">
        <span class="text-sm font-medium text-base-content/80">Provider</span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="provider()"
          (ngModelChange)="provider.set($event)"
        />
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-medium text-base-content/80">Model</span>
        <input
          class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-base-content outline-none transition focus:border-primary"
          type="text"
          [ngModel]="model()"
          (ngModelChange)="model.set($event)"
        />
      </label>
    </div>
  `,
})
export class SessionConfigFormComponent {
  readonly provider = model('');
  readonly model = model('');
}