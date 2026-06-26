import {
  clearStoredAuthState,
  readStoredAuthState,
  writeStoredAuthState,
} from './auth-storage';
import type { IStoredAuthState } from './auth-types';

function createMemoryStorage(): Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
> {
  const values = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    },
    removeItem(key: string): void {
      values.delete(key);
    },
  };
}

describe('auth storage helpers', () => {
  it('round-trips auth state', () => {
    const storage = createMemoryStorage();
    const state: IStoredAuthState = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        emailConfirmed: true,
        state: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    };

    writeStoredAuthState(state, storage);
    expect(readStoredAuthState(storage)).toEqual(state);

    clearStoredAuthState(storage);
    expect(readStoredAuthState(storage)).toBeNull();
  });
});
