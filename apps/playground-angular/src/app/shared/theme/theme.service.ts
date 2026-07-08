import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'playground-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<ThemeMode>(this.getInitialTheme());
  readonly isDark = signal(this.theme() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();

      this.isDark.set(theme === 'dark');
      this.applyTheme(theme);
      this.persistTheme(theme);
    });
  }

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);
  }

  toggleTheme(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private getInitialTheme(): ThemeMode {
    if (!this.isBrowser()) {
      return 'light';
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private applyTheme(theme: ThemeMode): void {
    if (!this.isBrowser()) {
      return;
    }

    this.document.documentElement.dataset['theme'] = theme;
  }

  private persistTheme(theme: ThemeMode): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
