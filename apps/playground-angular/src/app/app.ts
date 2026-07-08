// file: apps/playground-angular/src/app/app.ts

import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from './features/auth/auth.service';
import { ThemeToggleComponent } from './shared/theme';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggleComponent,
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-base text-base-content">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header class="border-b border-base-300 bg-base-100/90 backdrop-blur">
          <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div class="flex items-center gap-6">
              <a
                class="text-lg font-semibold tracking-tight text-base-content"
                routerLink="/"
              >
                Playground Angular
              </a>

              @if (isAuthenticated()) {
                <nav class="hidden items-center gap-2 sm:flex">
                  <a
                    class="rounded-full px-3 py-1.5 text-sm font-medium text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                    routerLink="/files"
                    routerLinkActive="bg-primary/10 text-primary"
                  >
                    Files
                  </a>

                  <a
                    class="rounded-full px-3 py-1.5 text-sm font-medium text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                    routerLink="/ai/sessions"
                    routerLinkActive="bg-primary/10 text-primary"
                  >
                    AI Session
                  </a>
                </nav>
              }
            </div>

            <div class="flex items-center gap-3">
              <app-theme-toggle />

              @if (isAuthenticated()) {
                <span class="hidden text-sm text-base-content/50 sm:inline">
                  {{ userLabel() }}
                </span>

                <button
                  class="rounded-full border border-base-300 px-4 py-2 text-sm font-medium text-base-content/70 transition hover:border-base-content/40 hover:bg-base-200 hover:text-base-content"
                  type="button"
                  (click)="logout()"
                >
                  Logout
                </button>
              } @else {
                <a
                  class="rounded-full px-4 py-2 text-sm font-medium text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                  routerLink="/login"
                  routerLinkActive="bg-accent text-accent-content hover:bg-accent hover:text-accent-content"
                >
                  Login
                </a>

                <a
                  class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-content transition hover:bg-primary/80"
                  routerLink="/register"
                >
                  Register
                </a>
              }
            </div>
          </div>
        </header>

        <main class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden p-4">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrl: './app.css',
})
export class App {
  private readonly authService = inject(AuthService);

  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly user = this.authService.user;

  protected readonly userLabel = computed(() => {
    const user = this.user();

    if (!user) {
      return '';
    }

    return user.displayName?.trim() || user.email;
  });

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }
}
