import type { IAiSessionActiveSessionStore } from "../../domain/types/ai-session-sdk-types.js";

export class BrowserActiveSessionStore implements IAiSessionActiveSessionStore {
  constructor(private readonly storageKey: string) {}

  getActiveSessionId(): string | null {
    try {
      return globalThis.localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  setActiveSessionId(sessionId: string | null): void {
    try {
      if (sessionId) {
        globalThis.localStorage.setItem(this.storageKey, sessionId);
        return;
      }

      globalThis.localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures for optional persistence.
    }
  }
}
