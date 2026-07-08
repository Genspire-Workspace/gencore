// file: apps\playground-angular\src\app\features\files\storage-api.client.ts

import { Injectable, inject } from '@angular/core';
import { appEnv } from '../../core/app-env';
import { AuthService } from '../auth/auth.service';
import type {
  IStorageFile,
  IStorageFileListResponse,
} from '@genspire/sdk-storage';
import { FetchStorageClient } from '@genspire/sdk-storage';

@Injectable({ providedIn: 'root' })
export class StorageApiClient {
  private readonly authService = inject(AuthService);
  private readonly client = new FetchStorageClient({
    baseUrl: appEnv.apiBaseUrl,
    getAccessToken: () => this.authService.ensureValidAccessToken(),
  });

  async listFiles(): Promise<IStorageFileListResponse> {
    return await this.client.listFiles();
  }

  async uploadFile(file: File): Promise<IStorageFile> {
    return await this.client.uploadFile(file);
  }

  createDownloadUrl(fileId: string): string {
    return this.client.createDownloadUrl(fileId);
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const accessToken = await this.authService.ensureValidAccessToken();
    const headers = new Headers();

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(this.client.createDownloadUrl(fileId), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}.`);
    }

    return await response.blob();
  }
}
