// file: apps\playground-angular\src\app\features\files\file.service.ts

import { Injectable, inject } from '@angular/core';
import type { IFileListResponse, IFileResponse } from './file-types';
import { StorageApiClient } from './storage-api.client';

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly storageApiClient = inject(StorageApiClient);

  async listFiles(): Promise<IFileListResponse> {
    return await this.storageApiClient.listFiles();
  }

  async uploadFile(file: File): Promise<IFileResponse> {
    return await this.storageApiClient.uploadFile(file);
  }

  createDownloadUrl(fileId: string): string {
    return this.storageApiClient.createDownloadUrl(fileId);
  }
}
