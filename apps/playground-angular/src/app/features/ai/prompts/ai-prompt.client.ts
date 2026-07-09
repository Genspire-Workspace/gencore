import { Injectable, inject } from '@angular/core';
import {
  FetchAiHttpTransport,
  FetchAiPromptClient,
} from '@genspire/sdk-ai';
import type {
  IAiPromptListResponseDto,
  IAiPromptResponseDto,
  ICreateAiPromptRequestDto,
  IDeleteAiPromptResponseDto,
  IUpdateAiPromptRequestDto,
} from '@genspire/sdk-ai';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AiPromptClient {
  private readonly authService = inject(AuthService);
  private readonly transport = new FetchAiHttpTransport({
    baseUrl: appEnv.apiBaseUrl,
    getAccessToken: () => this.authService.ensureValidAccessToken(),
  });
  private readonly client = new FetchAiPromptClient(this.transport);

  async listPrompts(): Promise<IAiPromptResponseDto[]> {
    const response: IAiPromptListResponseDto = await this.client.listPrompts();
    return response.items;
  }

  async createPrompt(input: ICreateAiPromptRequestDto): Promise<IAiPromptResponseDto> {
    return await this.client.createPrompt(input);
  }

  async updatePrompt(
    promptId: string,
    input: IUpdateAiPromptRequestDto,
  ): Promise<IAiPromptResponseDto> {
    return await this.client.updatePrompt(promptId, input);
  }

  async deletePrompt(promptId: string): Promise<IDeleteAiPromptResponseDto> {
    return await this.client.deletePrompt(promptId);
  }
}
