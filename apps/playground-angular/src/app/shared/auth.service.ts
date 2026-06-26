import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from './app-env';
import type {
  IAuthResponse,
  IAuthUser,
  IStoredAuthState,
} from './api-types';
import {
  clearStoredAuthState,
  readStoredAuthState,
  writeStoredAuthState,
} from './auth-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<IStoredAuthState | null>(
    readStoredAuthState(),
  );

  readonly authState = computed(() => this.state());
  readonly isAuthenticated = computed(() => !!this.state()?.accessToken);
  readonly user = computed<IAuthUser | null>(() => this.state()?.user ?? null);

  getAccessToken(): string | null {
    return this.state()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.state()?.refreshToken ?? null;
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<IAuthResponse>(`${appEnv.apiBaseUrl}/login`, {
        email,
        password,
      }),
    );

    this.setAuthState(response);
  }

  async register(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<IAuthResponse>(`${appEnv.apiBaseUrl}/register`, {
        email,
        password,
      }),
    );

    this.setAuthState(response);
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(`${appEnv.apiBaseUrl}/logout`, { refreshToken }),
        );
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

  private setAuthState(response: IAuthResponse): void {
    const state: IStoredAuthState = {
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType,
    };

    this.state.set(state);
    writeStoredAuthState(state);
  }
}
