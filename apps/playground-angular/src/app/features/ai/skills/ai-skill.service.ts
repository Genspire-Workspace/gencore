// file: apps\playground-angular\src\app\features\ai\skills\ai-skill.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';
import type {
  IAiSkillDownloadResponseDto,
  IAiSkillListResponseDto,
  IAiSkillRegistrationResponseDto,
  IAiSkillResponseDto,
  ICreateAiSkillRequestDto,
  IUpdateAiSkillRequestDto,
} from './ai-skill.types';

@Injectable({ providedIn: 'root' })
export class AiSkillService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  async list(): Promise<IAiSkillResponseDto[]> {
    const response = await firstValueFrom(
      this.http.get<IAiSkillListResponseDto>(
        `${appEnv.apiBaseUrl}/ai/skills`,
      ),
    );

    return response.items;
  }

  async create(
    input: ICreateAiSkillRequestDto,
  ): Promise<IAiSkillResponseDto> {
    return await firstValueFrom(
      this.http.post<IAiSkillResponseDto>(
        `${appEnv.apiBaseUrl}/ai/skills`,
        input,
      ),
    );
  }

  async update(
    id: string,
    input: IUpdateAiSkillRequestDto,
  ): Promise<IAiSkillResponseDto> {
    return await firstValueFrom(
      this.http.patch<IAiSkillResponseDto>(
        `${appEnv.apiBaseUrl}/ai/skills/${id}`,
        input,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${appEnv.apiBaseUrl}/ai/skills/${id}`),
    );
  }

  async setRegistered(
    id: string,
    registered: boolean,
  ): Promise<IAiSkillRegistrationResponseDto> {
    const endpoint = registered ? 'register' : 'unregister';
    return await firstValueFrom(
      this.http.post<IAiSkillRegistrationResponseDto>(
        `${appEnv.apiBaseUrl}/ai/skills/${id}/${endpoint}`,
        {},
      ),
    );
  }

  async getDownloadInfo(
    id: string,
  ): Promise<IAiSkillDownloadResponseDto | null> {
    return await firstValueFrom(
      this.http.get<IAiSkillDownloadResponseDto>(
        `${appEnv.apiBaseUrl}/ai/skills/${id}/download`,
      ),
    );
  }

  async importZipBundle(input: {
    file: File;
    visibility?: string;
    description?: string;
  }): Promise<IAiSkillResponseDto> {
    const accessToken = await this.authService.ensureValidAccessToken();
    if (!accessToken) {
      throw new Error('Authentication is required.');
    }

    const formData = new FormData();
    formData.append('file', input.file);
    if (input.visibility) {
      formData.append('visibility', input.visibility);
    }
    if (input.description) {
      formData.append('description', input.description);
    }

    const response = await fetch(`${appEnv.apiBaseUrl}/ai/skills/import`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Skill import failed with HTTP ${response.status}: ${errorBody}`,
      );
    }

    return (await response.json()) as IAiSkillResponseDto;
  }
}