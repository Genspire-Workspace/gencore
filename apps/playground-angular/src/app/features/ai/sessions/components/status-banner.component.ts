// file: apps\playground-angular\src\app\features\ai\sessions\components\status-banner.component.ts

import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BannerSeverity = 'info' | 'danger';

@Component({
  selector: 'app-ai-status-banner',
  host: {
    class: 'block',
  },
  imports: [CommonModule],
  template: `
    @if (message()) {
      <div
        class="mt-4 rounded-2xl border px-4 py-3 text-sm"
        [class.border-info]="severity() === 'info'"
        [class.bg-info]="severity() === 'info'"
        [class.bg-info/10]="severity() === 'info'"
        [class.text-info]="severity() === 'info'"
        [class.border-danger]="severity() === 'danger'"
        [class.bg-danger]="severity() === 'danger'"
        [class.bg-danger/10]="severity() === 'danger'"
        [class.text-danger]="severity() === 'danger'"
      >
        {{ message() }}
      </div>
    }
  `,
})
export class StatusBannerComponent {
  readonly message = input('');
  readonly severity = input<BannerSeverity>('info');
}