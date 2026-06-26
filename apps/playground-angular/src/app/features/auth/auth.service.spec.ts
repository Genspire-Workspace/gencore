import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
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
    });

    const { HttpClient } = await import('@angular/common/http');
    const injector = createEnvironmentInjector([
      {
        provide: HttpClient,
        useValue: {
          post: () => of(null),
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new AuthService());

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
    expect(service.user()?.email).toBe('user@example.com');
  });

  it('persists login responses to localStorage', async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const { HttpClient } = await import('@angular/common/http');
    const injector = createEnvironmentInjector([
      {
        provide: HttpClient,
        useValue: {
          post: (url: string, body: unknown) => {
            requests.push({ url, body });
            return of({
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
            });
          },
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new AuthService());
    await service.login('user@example.com', 'secret');

    expect(requests).toEqual([
      {
        url: 'http://localhost:3000/login',
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
});
