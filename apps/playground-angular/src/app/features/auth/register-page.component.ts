import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import type { IProblemDetails } from '../../core/problem-details';

@Component({
  selector: 'app-register-page',
  host: {
    class: 'block h-full min-h-0 flex-1 overflow-hidden',
  },
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
      <div class="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-8">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            Playground
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Create account
          </h1>
          <p class="mt-3 text-sm text-slate-500">
            Register a local playground account and continue directly into the
            file and AI pages.
          </p>
        </div>

        <form class="space-y-4" (ngSubmit)="submit()">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Email</span>
            <input
              class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              type="email"
              name="email"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              autocomplete="email"
              required
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Password</span>
            <input
              class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              type="password"
              name="password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              autocomplete="new-password"
              required
            />
          </label>

          @if (error()) {
            <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ error() }}
            </div>
          }

          <button
            class="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Creating account...' : 'Register' }}
          </button>
        </form>

        <p class="mt-6 text-sm text-slate-500">
          Already registered?
          <a class="font-medium text-sky-700 hover:text-sky-800" routerLink="/login">
            Login
          </a>
        </p>
      </div>
    </section>
  `,
})
export class RegisterPageComponent {
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
      await this.authService.register(this.email().trim(), this.password());
      await this.router.navigateByUrl('/files');
    } catch (error) {
      this.error.set(this.readErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private readErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      error.error &&
      typeof error.error === 'object'
    ) {
      return (
        (error.error as IProblemDetails).detail ||
        (error.error as IProblemDetails).title ||
        'Registration failed.'
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Registration failed.';
  }
}
