// file: apps\playground-angular\src\app\features\auth\auth.service.ts

import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  IAuthResponse,
  IAuthUser,
  IStoredAuthState,
} from './auth-types';
import { AuthApiClient } from './auth-api.client';
import {
  clearStoredAuthState,
  readStoredAuthState,
  writeStoredAuthState,
} from './auth-storage';

const ACCESS_TOKEN_REFRESH_LEEWAY_MS = 60_000;

function readJwtExpiration(accessToken: string): number | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(parts[1] ?? ''));
    const exp = payload?.exp;

    return typeof exp === 'number' && Number.isFinite(exp)
      ? exp * 1000
      : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApiClient = inject(AuthApiClient);
  private readonly state = signal<IStoredAuthState | null>(
    readStoredAuthState(),
  );
  private refreshPromise: Promise<string | null> | null = null;

  readonly authState = computed(() => this.state());
  readonly isAuthenticated = computed(() => !!this.state()?.accessToken);
  readonly user = computed<IAuthUser | null>(() => this.state()?.user ?? null);

  getAccessToken(): string | null {
    return this.state()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.state()?.refreshToken ?? null;
  }

  async ensureValidAccessToken(): Promise<string | null> {
    const state = this.state();
    if (!state?.accessToken) {
      return null;
    }

    if (!this.shouldRefreshToken(state)) {
      return state.accessToken;
    }

    return await this.refreshAccessToken();
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.authApiClient.login({
      email,
      password,
    });

    this.setAuthState(response);
  }

  async register(email: string, password: string): Promise<void> {
    const response = await this.authApiClient.register({
      email,
      password,
    });

    this.setAuthState(response);
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      try {
        await this.authApiClient.logout({ refreshToken });
      } catch {
        // Local state should still be cleared even if server logout fails.
      }
    }

    this.clearAuthState();
  }

  clearAuthState(): void {
    this.state.set(null);
    clearStoredAuthState();
  }

  private shouldRefreshToken(state: IStoredAuthState): boolean {
    const expiresAt = state.expiresAt ?? readJwtExpiration(state.accessToken);
    if (!expiresAt) {
      return true;
    }

    return Date.now() + ACCESS_TOKEN_REFRESH_LEEWAY_MS >= expiresAt;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearAuthState();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await this.authApiClient.refresh({
          refreshToken,
        });

        this.setAuthState(response);
        return response.accessToken;
      } catch {
        this.clearAuthState();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return await this.refreshPromise;
  }

  private setAuthState(response: IAuthResponse): void {
    const expiresAt =
      Date.now() + Math.max(response.expiresIn, 0) * 1000;

    const state: IStoredAuthState = {
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType,
      expiresAt,
    };

    this.state.set(state);
    writeStoredAuthState(state);
  }
}
