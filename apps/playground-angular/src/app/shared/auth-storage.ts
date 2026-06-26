import type { IStoredAuthState } from './api-types';

const AUTH_STORAGE_KEY = 'playground-angular.auth';

function resolveStorage(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readStoredAuthState(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): IStoredAuthState | null {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  const raw = target.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as IStoredAuthState;
  } catch {
    target.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAuthState(
  state: IStoredAuthState,
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): void {
  resolveStorage(storage)?.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredAuthState(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): void {
  resolveStorage(storage)?.removeItem(AUTH_STORAGE_KEY);
}
