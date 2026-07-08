// file: apps\playground-angular\src\app\features\ai\sessions\ai-session.service.ts

import { Injectable, inject } from '@angular/core';
import {
  AiSessionWorkspaceManager,
  BrowserActiveSessionStore,
  FetchAiHttpTransport,
  FetchAiSessionClient,
} from '@genspire/sdk-ai';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';

const ACTIVE_SESSION_STORAGE_KEY = 'playground-angular.ai-session-id';

@Injectable({ providedIn: 'root' })
export class AiSessionService {
  private readonly authService = inject(AuthService);
  private readonly activeSessionStore = new BrowserActiveSessionStore(
    ACTIVE_SESSION_STORAGE_KEY,
  );
  private readonly transport = new FetchAiHttpTransport({
    baseUrl: appEnv.apiBaseUrl,
    getAccessToken: () => this.authService.ensureValidAccessToken(),
  });
  private readonly sessionClient = new FetchAiSessionClient(this.transport);

  getActiveSessionId(): string | null {
    return this.activeSessionStore.getActiveSessionId();
  }

  setActiveSessionId(sessionId: string | null): void {
    this.activeSessionStore.setActiveSessionId(sessionId);
  }

  createWorkspaceManager(): AiSessionWorkspaceManager {
    return new AiSessionWorkspaceManager(this.sessionClient, {
      defaultProvider: appEnv.defaultAiProvider,
      defaultModel: appEnv.defaultAiModel,
      source: 'playground-angular',
      activeSessionStore: this.activeSessionStore,
    });
  }
}
