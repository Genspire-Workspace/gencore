// file: apps\playground-angular\src\app\features\auth\login-page.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import type { IProblemDetails } from '../../core/problem-details';

@Component({
  selector: 'app-login-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
      <div class="mx-auto w-full max-w-md">
        <div class="rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <div class="mb-8">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-primary">Playground</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-base-content">Sign in</h1>
            <p class="mt-3 text-sm text-base-content/60">
              Use the playground API credentials to test auth, file upload, and AI sessions from a
              frontend flow.
            </p>
          </div>

          <form class="space-y-4" (ngSubmit)="submit()">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-base-content/80">Email</span>
              <input
                class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-base-content outline-none transition placeholder:text-base-content/40 focus:border-primary"
                type="email"
                name="email"
                [ngModel]="email()"
                (ngModelChange)="email.set($event)"
                autocomplete="email"
                required
              />
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-base-content/80">Password</span>
              <input
                class="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-base-content outline-none transition placeholder:text-base-content/40 focus:border-primary"
                type="password"
                name="password"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
                autocomplete="current-password"
                required
              />
            </label>

            @if (error()) {
              <div
                class="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {{ error() }}
              </div>
            }

            <button
              class="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-content transition hover:bg-accent/80 disabled:cursor-not-allowed disabled:bg-base-300"
              type="submit"
              [disabled]="submitting()"
            >
              {{ submitting() ? 'Signing in...' : 'Login' }}
            </button>
          </form>

          <p class="mt-6 text-sm text-base-content/60">
            Need an account?
            <a class="font-medium text-primary hover:text-primary/80" routerLink="/register">
              Register
            </a>
          </p>
        </div>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly submitting = signal(false);

  protected async submit(): Promise<void> {
    this.error.set('');
    this.submitting.set(true);

    try {
      await this.authService.login(this.email().trim(), this.password());
      await this.router.navigateByUrl('/files');
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      return (
        (error.error as IProblemDetails).detail ||
        (error.error as IProblemDetails).title ||
        'Login failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Login failed.';
  }
}
