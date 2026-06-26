import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../core/app-env';
import type { IFileListResponse, IFileResponse } from './file-types';

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly http = inject(HttpClient);

  async listFiles(): Promise<IFileListResponse> {
    return await firstValueFrom(
      this.http.get<IFileListResponse>(`${appEnv.apiBaseUrl}/file`),
    );
  }

  async uploadFile(file: File): Promise<IFileResponse> {
    const formData = new FormData();
    formData.set('file', file, file.name);

    return await firstValueFrom(
      this.http.post<IFileResponse>(`${appEnv.apiBaseUrl}/file`, formData),
    );
  }

  createDownloadUrl(fileId: string): string {
    return `${appEnv.apiBaseUrl}/file/${fileId}`;
  }
}
