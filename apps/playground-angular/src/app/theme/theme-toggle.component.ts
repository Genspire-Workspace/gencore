// file: apps/playground-angular/src/app/features/theme/theme-toggle.component.ts

import { Component, computed, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-200"
      (click)="themeService.toggleTheme()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="ariaLabel()"
    >
      <span aria-hidden="true">
        {{ icon() }}
      </span>

      <span>
        {{ label() }}
      </span>
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly label = computed(() =>
    this.themeService.theme() === 'dark' ? 'Light theme' : 'Dark theme',
  );

  protected readonly icon = computed(() =>
    this.themeService.theme() === 'dark' ? '☀️' : '🌙',
  );

  protected readonly ariaLabel = computed(() =>
    this.themeService.theme() === 'dark'
      ? 'Switch to light theme'
      : 'Switch to dark theme',
  );
}