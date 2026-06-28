// file: apps\playground-angular\src\app\features\ai\sessions\ai-session.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type {
  IAiSessionCreateRequest,
  IAiSessionGraphResponse,
  IAiSessionMessageRequest,
  IAiSessionResponse,
  IAiSessionStreamChunk,
  IAiSessionTimelineTurnSnapshotDto,
  IAiSessionUpdateRequest,
} from './ai-session-types';
import { AiSessionApiClient } from './ai-session-api.client';

const ACTIVE_SESSION_STORAGE_KEY = 'playground-angular.ai-session-id';

function readStoredSessionId(): string | null {
  try {
    return globalThis.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSessionId(sessionId: string | null): void {
  try {
    if (sessionId) {
      globalThis.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
      return;
    }

    globalThis.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures in local playground usage.
  }
}

@Injectable({ providedIn: 'root' })
export class AiSessionService {
  private readonly aiSessionApiClient = inject(AiSessionApiClient);

  getActiveSessionId(): string | null {
    return readStoredSessionId();
  }

  setActiveSessionId(sessionId: string | null): void {
    writeStoredSessionId(sessionId);
  }

  async listSessions(): Promise<IAiSessionResponse[]> {
    return (await this.aiSessionApiClient.listSessions()).items;
  }

  async createSession(
    input: IAiSessionCreateRequest = {},
  ): Promise<IAiSessionResponse> {
    const session = await this.aiSessionApiClient.createSession(input);
    this.setActiveSessionId(session.id);
    return session;
  }

  async activateSession(sessionId: string): Promise<IAiSessionResponse | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      if (this.getActiveSessionId() === sessionId) {
        this.setActiveSessionId(null);
      }

      return null;
    }

    this.setActiveSessionId(session.id);
    return session;
  }

  async getSession(sessionId: string): Promise<IAiSessionResponse | null> {
    try {
      return await this.aiSessionApiClient.getSession(sessionId);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async ensureSession(): Promise<IAiSessionResponse> {
    const currentSessionId = this.getActiveSessionId();

    if (currentSessionId) {
      const session = await this.getSession(currentSessionId);
      if (session) {
        return session;
      }
    }

    return await this.createSession({
      type: 'chat',
      metadata: {
        source: 'playground-angular',
      },
    });
  }

  async updateSession(
    sessionId: string,
    input: IAiSessionUpdateRequest,
  ): Promise<IAiSessionResponse> {
    return await this.aiSessionApiClient.updateSession(sessionId, input);
  }

  async getSessionGraph(
    sessionId: string,
    timelineId?: string,
  ): Promise<IAiSessionGraphResponse> {
    return await this.aiSessionApiClient.getSessionGraph(sessionId, timelineId);
  }

  async listTimelineTurns(
    sessionId: string,
    timelineId: string,
  ): Promise<IAiSessionTimelineTurnSnapshotDto[]> {
    return (await this.aiSessionApiClient.listTimelineTurns(sessionId, timelineId))
      .items;
  }

  async streamMessage(
    sessionId: string,
    timelineId: string,
    input: IAiSessionMessageRequest,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    await this.aiSessionApiClient.streamGenerate(
      sessionId,
      timelineId,
      input,
      onChunk,
    );
  }
}
