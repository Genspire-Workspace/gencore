// file: apps\playground-angular\src\app\features\auth\auth.service.spec.ts

import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthApiClient } from './auth-api.client';
import { clearStoredAuthState, writeStoredAuthState } from './auth-storage';

function installMemoryStorage(): void {
  const state = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => state.get(key) ?? null,
      setItem: (key: string, value: string) => {
        state.set(key, value);
      },
      removeItem: (key: string) => {
        state.delete(key);
      },
      clear: () => {
        state.clear();
      },
    },
  });
}

describe('AuthService', () => {
  beforeEach(() => {
    installMemoryStorage();
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    clearStoredAuthState();
  });

  it('rehydrates persisted auth state from localStorage', async () => {
    writeStoredAuthState({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        emailConfirmed: true,
        state: 'active',
        createdAt: '2026-06-26T00:00:00.000Z',
        updatedAt: '2026-06-26T00:00:00.000Z',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3600_000,
    });

    const injector = createEnvironmentInjector([
      {
        provide: AuthApiClient,
        useValue: {
          login: async () => null,
          register: async () => null,
          refresh: async () => null,
          logout: async () => undefined,
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new AuthService());

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
    expect(service.user()?.email).toBe('user@example.com');
  });

  it('persists login responses to localStorage', async () => {
    const requests: Array<{ action: string; body: unknown }> = [];
    const injector = createEnvironmentInjector([
      {
        provide: AuthApiClient,
        useValue: {
          login: async (body: unknown) => {
            requests.push({ action: 'login', body });
            return {
              user: {
                id: 'user-1',
                email: 'user@example.com',
                emailConfirmed: true,
                state: 'active',
                createdAt: '2026-06-26T00:00:00.000Z',
                updatedAt: '2026-06-26T00:00:00.000Z',
              },
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
              tokenType: 'Bearer',
            };
          },
          register: async () => null,
          refresh: async () => null,
          logout: async () => undefined,
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new AuthService());
    await service.login('user@example.com', 'secret');

    expect(requests).toEqual([
      {
        action: 'login',
        body: {
          email: 'user@example.com',
          password: 'secret',
        },
      },
    ]);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('new-access-token');
    expect(globalThis.localStorage.getItem('playground-angular.auth')).toContain(
      'new-access-token',
    );
  });

  it('refreshes the access token when it is nearing expiration', async () => {
    const requests: Array<{ action: string; body: unknown }> = [];
    writeStoredAuthState({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        emailConfirmed: true,
        state: 'active',
        createdAt: '2026-06-26T00:00:00.000Z',
        updatedAt: '2026-06-26T00:00:00.000Z',
      },
      accessToken: 'expiring-access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
      expiresAt: Date.now() + 5_000,
    });

    const injector = createEnvironmentInjector([
      {
        provide: AuthApiClient,
        useValue: {
          login: async () => null,
          register: async () => null,
          refresh: async (body: unknown) => {
            requests.push({ action: 'refresh', body });
            return {
              user: {
                id: 'user-1',
                email: 'user@example.com',
                emailConfirmed: true,
                state: 'active',
                createdAt: '2026-06-26T00:00:00.000Z',
                updatedAt: '2026-06-26T00:00:00.000Z',
              },
              accessToken: 'refreshed-access-token',
              refreshToken: 'rotated-refresh-token',
              expiresIn: 3600,
              tokenType: 'Bearer',
            };
          },
          logout: async () => undefined,
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new AuthService());
    const token = await service.ensureValidAccessToken();

    expect(token).toBe('refreshed-access-token');
    expect(requests).toEqual([
      {
        action: 'refresh',
        body: {
          refreshToken: 'refresh-token',
        },
      },
    ]);
  });
});
