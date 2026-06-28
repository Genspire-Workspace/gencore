// file: apps\playground-angular\src\app\features\files\storage-api.client.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../core/app-env';
import type {
  IFileListResponseDto,
  IFileResponseDto,
} from '@genspire/storage/server/contracts';

@Injectable({ providedIn: 'root' })
export class StorageApiClient {
  private readonly http = inject(HttpClient);

  async listFiles(): Promise<IFileListResponseDto> {
    return await firstValueFrom(
      this.http.get<IFileListResponseDto>(`${appEnv.apiBaseUrl}/file`),
    );
  }

  async uploadFile(file: File): Promise<IFileResponseDto> {
    const formData = new FormData();
    formData.set('file', file, file.name);

    return await firstValueFrom(
      this.http.post<IFileResponseDto>(`${appEnv.apiBaseUrl}/file`, formData),
    );
  }

  createDownloadUrl(fileId: string): string {
    return `${appEnv.apiBaseUrl}/file/${fileId}`;
  }
}
