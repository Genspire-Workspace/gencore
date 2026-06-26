import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../core/app-env';
import { AuthService } from '../auth/auth.service';
import { readNdjsonLines } from './ai-session-stream';
import type {
  IAiSessionCreateRequest,
  IAiSessionMessageDto,
  IAiSessionMessageListResponse,
  IAiSessionMessageRequest,
  IAiSessionResponse,
  IAiSessionStreamChunk,
} from './ai-session-types';

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
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getActiveSessionId(): string | null {
    return readStoredSessionId();
  }

  setActiveSessionId(sessionId: string | null): void {
    writeStoredSessionId(sessionId);
  }

  async createSession(
    input: IAiSessionCreateRequest = {},
  ): Promise<IAiSessionResponse> {
    const session = await firstValueFrom(
      this.http.post<IAiSessionResponse>(
        `${appEnv.apiBaseUrl}/ai/sessions`,
        input,
      ),
    );

    this.setActiveSessionId(session.id);
    return session;
  }

  async getSession(sessionId: string): Promise<IAiSessionResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<IAiSessionResponse>(
          `${appEnv.apiBaseUrl}/ai/sessions/${sessionId}`,
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
      metadata: {
        source: 'playground-angular',
      },
    });
  }

  async listMessages(sessionId: string): Promise<IAiSessionMessageDto[]> {
    const response = await firstValueFrom(
      this.http.get<IAiSessionMessageListResponse>(
        `${appEnv.apiBaseUrl}/ai/sessions/${sessionId}/messages`,
      ),
    );

    return response.items;
  }

  async streamMessage(
    sessionId: string,
    input: IAiSessionMessageRequest,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    const accessToken = await this.authService.ensureValidAccessToken();
    if (!accessToken) {
      throw new Error('Authentication is required.');
    }

    const response = await fetch(
      `${appEnv.apiBaseUrl}/ai/sessions/${sessionId}/messages/stream`,
      {
        method: 'POST',
        headers: {
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
        const extracted = readNdjsonLines(buffer);
        buffer = extracted.remainder;

        for (const line of extracted.lines) {
          onChunk(JSON.parse(line) as IAiSessionStreamChunk);
        }
      }

      buffer += decoder.decode();
      const trailing = buffer.trim();

      if (trailing) {
        onChunk(JSON.parse(trailing) as IAiSessionStreamChunk);
      }
    } finally {
      reader.releaseLock();
    }
  }
}
