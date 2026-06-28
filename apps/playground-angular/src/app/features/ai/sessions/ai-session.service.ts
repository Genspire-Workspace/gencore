// file: apps\playground-angular\src\app\features\ai\sessions\ai-session.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';
import { readSseEventData } from '../shared/ai-sse';
import type {
  IAiSessionCreateRequest,
  IAiSessionGraphResponse,
  IAiSessionListResponse,
  IAiSessionMessageRequest,
  IAiSessionResponse,
  IAiSessionStreamChunk,
  IAiSessionTimelineTurnSnapshotDto,
  IAiSessionTimelineTurnListResponse,
  IAiSessionUpdateRequest,
} from './ai-session-types';

const ACTIVE_SESSION_STORAGE_KEY = 'playground-angular.ai-session-id';
const AI_SESSION_API_PATH = '/api/v1/ai/sessions';

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
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getActiveSessionId(): string | null {
    return readStoredSessionId();
  }

  setActiveSessionId(sessionId: string | null): void {
    writeStoredSessionId(sessionId);
  }

  async listSessions(): Promise<IAiSessionResponse[]> {
    const response = await firstValueFrom(
      this.http.get<IAiSessionListResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}`,
      ),
    );

    return response.items;
  }

  async createSession(
    input: IAiSessionCreateRequest = {},
  ): Promise<IAiSessionResponse> {
    const session = await firstValueFrom(
      this.http.post<IAiSessionResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}`,
        input,
      ),
    );

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
      return await firstValueFrom(
        this.http.get<IAiSessionResponse>(
          `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}`,
        ),
      );
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
    return await firstValueFrom(
      this.http.patch<IAiSessionResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}`,
        input,
      ),
    );
  }

  async getSessionGraph(
    sessionId: string,
    timelineId?: string,
  ): Promise<IAiSessionGraphResponse> {
    const suffix = timelineId
      ? `/timelines/${timelineId}/graph`
      : '/graph';

    return await firstValueFrom(
      this.http.get<IAiSessionGraphResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}${suffix}`,
      ),
    );
  }

  async listTimelineTurns(
    sessionId: string,
    timelineId: string,
  ): Promise<IAiSessionTimelineTurnSnapshotDto[]> {
    const response = await firstValueFrom(
      this.http.get<IAiSessionTimelineTurnListResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/turns`,
      ),
    );

    return response.items;
  }

  async streamMessage(
    sessionId: string,
    timelineId: string,
    input: IAiSessionMessageRequest,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    const accessToken = await this.authService.ensureValidAccessToken();
    if (!accessToken) {
      throw new Error('Authentication is required.');
    }

    const response = await fetch(
      `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/generate`,
      {
        method: 'POST',
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Stream request failed with HTTP ${response.status}: ${errorBody}`,
      );
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const extracted = readSseEventData(buffer);
        buffer = extracted.remainder;

        for (const eventData of extracted.events) {
          onChunk(JSON.parse(eventData) as IAiSessionStreamChunk);
        }
      }

      buffer += decoder.decode();
      const trailing = readSseEventData(buffer);
      for (const eventData of trailing.events) {
        onChunk(JSON.parse(eventData) as IAiSessionStreamChunk);
      }
    } finally {
      reader.releaseLock();
    }
  }
}
