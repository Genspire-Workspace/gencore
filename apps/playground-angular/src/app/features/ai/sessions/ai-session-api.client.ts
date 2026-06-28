// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-api.client.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';
import { streamSseJson } from '../shared/ai-sse-client';
import type {
  IAiSessionBranchListResponseDto,
  IAiSessionBranchResponseDto,
  IAiSessionCreateRequest,
  IAiSessionGraphResponse,
  IAiSessionListResponse,
  IAiSessionMessageFeedbackResponseDto,
  IAiSessionMessageRequest,
  IAiSessionResponse,
  IAiSessionStreamChunk,
  IAiSessionTimelineDto,
  IAiSessionTimelineTurnListResponse,
  IAiSessionUpdateRequest,
} from './ai-session-types';
import type {
  ICreateAiBranchRequestDto,
  ICreateAiMessageFeedbackRequestDto,
  ICreateAiTimelineRequestDto,
  IEditAiUserAndRegenerateRequestDto,
  IRegenerateAiAssistantRequestDto,
} from '@genspire/ai/server/contracts';

const AI_SESSION_API_PATH = '/api/v1/ai/sessions';

@Injectable({ providedIn: 'root' })
export class AiSessionApiClient {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  async listSessions(): Promise<IAiSessionListResponse> {
    return await firstValueFrom(
      this.http.get<IAiSessionListResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}`,
      ),
    );
  }

  async createSession(
    input: IAiSessionCreateRequest = {},
  ): Promise<IAiSessionResponse> {
    return await firstValueFrom(
      this.http.post<IAiSessionResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}`,
        input,
      ),
    );
  }

  async getSession(sessionId: string): Promise<IAiSessionResponse> {
    return await firstValueFrom(
      this.http.get<IAiSessionResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}`,
      ),
    );
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
    const suffix = timelineId ? `/timelines/${timelineId}/graph` : '/graph';
    return await firstValueFrom(
      this.http.get<IAiSessionGraphResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}${suffix}`,
      ),
    );
  }

  async listTimelines(sessionId: string): Promise<{ items: IAiSessionTimelineDto[] }> {
    return await firstValueFrom(
      this.http.get<{ items: IAiSessionTimelineDto[] }>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines`,
      ),
    );
  }

  async createTimeline(
    sessionId: string,
    input: ICreateAiTimelineRequestDto,
  ): Promise<IAiSessionTimelineDto> {
    return await firstValueFrom(
      this.http.post<IAiSessionTimelineDto>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines`,
        input,
      ),
    );
  }

  async listTimelineTurns(
    sessionId: string,
    timelineId: string,
  ): Promise<IAiSessionTimelineTurnListResponse> {
    return await firstValueFrom(
      this.http.get<IAiSessionTimelineTurnListResponse>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/turns`,
      ),
    );
  }

  async listBranches(
    sessionId: string,
  ): Promise<IAiSessionBranchListResponseDto> {
    return await firstValueFrom(
      this.http.get<IAiSessionBranchListResponseDto>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/branches`,
      ),
    );
  }

  async createBranch(
    sessionId: string,
    input: ICreateAiBranchRequestDto,
  ): Promise<{ branch: IAiSessionBranchResponseDto; timeline: IAiSessionTimelineDto }> {
    return await firstValueFrom(
      this.http.post<{ branch: IAiSessionBranchResponseDto; timeline: IAiSessionTimelineDto }>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/branches`,
        input,
      ),
    );
  }

  async createFeedback(
    sessionId: string,
    messageId: string,
    input: ICreateAiMessageFeedbackRequestDto,
  ): Promise<IAiSessionMessageFeedbackResponseDto> {
    return await firstValueFrom(
      this.http.post<IAiSessionMessageFeedbackResponseDto>(
        `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/messages/${messageId}/feedback`,
        input,
      ),
    );
  }

  async streamGenerate(
    sessionId: string,
    timelineId: string,
    input: IAiSessionMessageRequest,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    await this.streamSessionEvent(
      `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/generate`,
      input,
      onChunk,
    );
  }

  async streamRegenerateAssistant(
    sessionId: string,
    timelineId: string,
    input: IRegenerateAiAssistantRequestDto,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    await this.streamSessionEvent(
      `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/regenerate-assistant`,
      input,
      onChunk,
    );
  }

  async streamEditUserAndRegenerate(
    sessionId: string,
    timelineId: string,
    input: IEditAiUserAndRegenerateRequestDto,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    await this.streamSessionEvent(
      `${appEnv.apiBaseUrl}${AI_SESSION_API_PATH}/${sessionId}/timelines/${timelineId}/edit-user-and-regenerate`,
      input,
      onChunk,
    );
  }

  private async streamSessionEvent(
    url: string,
    body: unknown,
    onChunk: (chunk: IAiSessionStreamChunk) => void,
  ): Promise<void> {
    const accessToken = await this.authService.ensureValidAccessToken();
    if (!accessToken) {
      throw new Error('Authentication is required.');
    }

    await streamSseJson<IAiSessionStreamChunk>(
      {
        url,
        accessToken,
        body,
      },
      onChunk,
    );
  }
}
