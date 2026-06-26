import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from './features/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div class="flex items-center gap-6">
            <a class="text-lg font-semibold tracking-tight text-slate-900" routerLink="/">
              Playground Angular
            </a>

            @if (isAuthenticated()) {
              <nav class="hidden items-center gap-2 sm:flex">
                <a
                  class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  routerLink="/files"
                  routerLinkActive="bg-sky-100 text-sky-800"
                >
                  Files
                </a>
                <a
                  class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  routerLink="/ai-session"
                  routerLinkActive="bg-sky-100 text-sky-800"
                >
                  AI Session
                </a>
              </nav>
            }
          </div>

          <div class="flex items-center gap-3">
            @if (isAuthenticated()) {
              <span class="hidden text-sm text-slate-500 sm:inline">
                {{ userLabel() }}
              </span>
              <button
                class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                type="button"
                (click)="logout()"
              >
                Logout
              </button>
            } @else {
              <a
                class="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                routerLink="/login"
                routerLinkActive="bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
              >
                Login
              </a>
              <a
                class="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                routerLink="/register"
              >
                Register
              </a>
            }
          </div>
        </div>
      </header>

      <main class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6">
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
