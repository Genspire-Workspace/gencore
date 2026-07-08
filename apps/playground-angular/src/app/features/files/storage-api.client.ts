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
}
