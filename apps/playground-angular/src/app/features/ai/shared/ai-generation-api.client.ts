// file: apps\playground-angular\src\app\features\ai\shared\ai-generation-api.client.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';
import { streamSseJson } from './ai-sse-client';
import type {
  IAiEmbeddingRequest,
  IAiEmbeddingResponse,
  IAiGenerationRequest,
  IAiGenerationResponse,
  IAiGenerationStreamChunk,
} from './ai-generation-types';

const AI_ADMIN_API_PATH = '/api/v1/ai/admin';

@Injectable({ providedIn: 'root' })
export class AiGenerationApiClient {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  async generateChat(input: IAiGenerationRequest): Promise<IAiGenerationResponse> {
    return await firstValueFrom(
      this.http.post<IAiGenerationResponse>(
        `${appEnv.apiBaseUrl}${AI_ADMIN_API_PATH}/chat/generate`,
        input,
      ),
    );
  }

  async streamChat(
    input: IAiGenerationRequest,
    onChunk: (chunk: IAiGenerationStreamChunk) => void,
  ): Promise<void> {
    const accessToken = await this.authService.ensureValidAccessToken();
    if (!accessToken) {
      throw new Error('Authentication is required.');
    }

    await streamSseJson<IAiGenerationStreamChunk>(
      {
        url: `${appEnv.apiBaseUrl}${AI_ADMIN_API_PATH}/chat/generate`,
        accessToken,
        body: {
          ...input,
          settings: {
            ...input.settings,
            stream: true,
          },
        },
      },
      onChunk,
    );
  }

  async generateEmbedding(
    input: IAiEmbeddingRequest,
  ): Promise<IAiEmbeddingResponse> {
    return await firstValueFrom(
      this.http.post<IAiEmbeddingResponse>(
        `${appEnv.apiBaseUrl}${AI_ADMIN_API_PATH}/embeddings/generate`,
        input,
      ),
    );
  }
}
