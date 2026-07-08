// file: apps\playground-angular\src\app\features\files\file.service.spec.ts

import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { FileService } from './file.service';
import { StorageApiClient } from './storage-api.client';

describe('FileService', () => {
  it('requests the file list from the API', async () => {
    const requests: Array<{ action: string; body?: unknown }> = [];
    const injector = createEnvironmentInjector([
      {
        provide: StorageApiClient,
        useValue: {
          listFiles: async () => {
            requests.push({ action: 'listFiles' });
            return { items: [], hasMore: false };
          },
          uploadFile: async () => null,
          createDownloadUrl: () => '',
          downloadFile: async () => new Blob(),
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new FileService());
    await expect(service.listFiles()).resolves.toEqual({
      items: [],
      hasMore: false,
    });
    expect(requests).toEqual([
      {
        action: 'listFiles',
      },
    ]);
  });

  it('uploads multipart form data with a file field', async () => {
    const requests: Array<{ action: string; body?: unknown }> = [];
    const injector = createEnvironmentInjector([
      {
        provide: StorageApiClient,
        useValue: {
          listFiles: async () => ({ items: [], hasMore: false }),
          uploadFile: async (file: File) => {
            requests.push({ action: 'uploadFile', body: file });
            return {
              id: 'file-1',
              bucket: 'uploads',
              key: 'hello.txt',
              originalName: 'hello.txt',
              size: 5,
              createdAt: '2026-06-26T00:00:00.000Z',
              updatedAt: '2026-06-26T00:00:00.000Z',
            };
          },
          createDownloadUrl: () => '',
          downloadFile: async () => new Blob(),
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new FileService());
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await expect(service.uploadFile(file)).resolves.toMatchObject({
      id: 'file-1',
      originalName: 'hello.txt',
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.action).toBe('uploadFile');
    expect(requests[0]?.body instanceof File).toBe(true);
    expect((requests[0]?.body as File).name).toBe('hello.txt');
  });

  it('downloads a file blob from the API', async () => {
    const fileBlob = new Blob(['hello'], { type: 'text/plain' });
    const injector = createEnvironmentInjector([
      {
        provide: StorageApiClient,
        useValue: {
          listFiles: async () => ({ items: [], hasMore: false }),
          uploadFile: async () => null,
          createDownloadUrl: () => '',
          downloadFile: async (fileId: string) => {
            expect(fileId).toBe('file-1');
            return fileBlob;
          },
        },
      },
    ]);

    const service = runInInjectionContext(injector, () => new FileService());

    await expect(service.downloadFile('file-1')).resolves.toBe(fileBlob);
  });
});
