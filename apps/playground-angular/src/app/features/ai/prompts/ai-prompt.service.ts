// file: apps\playground-angular\src\app\features\ai\prompts\ai-prompt.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../../core/app-env';
import type {
  IAiPromptListResponseDto,
  IAiPromptResponseDto,
  ICreateAiPromptRequestDto,
  IUpdateAiPromptRequestDto,
} from './ai-prompt.types';

@Injectable({ providedIn: 'root' })
export class AiPromptService {
  private readonly http = inject(HttpClient);

  async list(): Promise<IAiPromptResponseDto[]> {
    const response = await firstValueFrom(
      this.http.get<IAiPromptListResponseDto>(
        `${appEnv.apiBaseUrl}/ai/prompts`,
      ),
    );

    return response.items;
  }

  async create(
    input: ICreateAiPromptRequestDto,
  ): Promise<IAiPromptResponseDto> {
    return await firstValueFrom(
      this.http.post<IAiPromptResponseDto>(
        `${appEnv.apiBaseUrl}/ai/prompts`,
        input,
      ),
    );
  }

  async update(
    id: string,
    input: IUpdateAiPromptRequestDto,
  ): Promise<IAiPromptResponseDto> {
    return await firstValueFrom(
      this.http.patch<IAiPromptResponseDto>(
        `${appEnv.apiBaseUrl}/ai/prompts/${id}`,
        input,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${appEnv.apiBaseUrl}/ai/prompts/${id}`),
    );
  }
}