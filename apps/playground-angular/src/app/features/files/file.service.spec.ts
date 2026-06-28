// file: apps\playground-angular\src\app\features\files\file.service.spec.ts

import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
<<<<<<< ours
import { of } from 'rxjs';
import { FileService } from './file.service';

describe('FileService', () => {
  it('requests the file list from the API', async () => {
    const requests: Array<{ method: string; url: string; body?: unknown }> = [];
    const { HttpClient } = await import('@angular/common/http');
    const injector = createEnvironmentInjector([
      {
        provide: HttpClient,
        useValue: {
          get: (url: string) => {
            requests.push({ method: 'GET', url });
            return of({ items: [], hasMore: false });
          },
          post: () => of(null),
=======
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
>>>>>>> theirs
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
<<<<<<< ours
        method: 'GET',
        url: 'http://localhost:3000/file',
=======
        action: 'listFiles',
>>>>>>> theirs
      },
    ]);
  });

  it('uploads multipart form data with a file field', async () => {
<<<<<<< ours
    const requests: Array<{ method: string; url: string; body?: unknown }> = [];
    const { HttpClient } = await import('@angular/common/http');
    const injector = createEnvironmentInjector([
      {
        provide: HttpClient,
        useValue: {
          get: () => of({ items: [], hasMore: false }),
          post: (url: string, body: unknown) => {
            requests.push({ method: 'POST', url, body });
            return of({
=======
    const requests: Array<{ action: string; body?: unknown }> = [];
    const injector = createEnvironmentInjector([
      {
        provide: StorageApiClient,
        useValue: {
          listFiles: async () => ({ items: [], hasMore: false }),
          uploadFile: async (file: File) => {
            requests.push({ action: 'uploadFile', body: file });
            return {
>>>>>>> theirs
              id: 'file-1',
              bucket: 'uploads',
              key: 'hello.txt',
              originalName: 'hello.txt',
              size: 5,
              createdAt: '2026-06-26T00:00:00.000Z',
              updatedAt: '2026-06-26T00:00:00.000Z',
<<<<<<< ours
            });
          },
=======
            };
          },
          createDownloadUrl: () => '',
>>>>>>> theirs
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
<<<<<<< ours
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://localhost:3000/file');
    expect(requests[0]?.body instanceof FormData).toBe(true);

    const uploaded = (requests[0]?.body as FormData).get('file');
    expect(uploaded instanceof File).toBe(true);
    expect((uploaded as File).name).toBe('hello.txt');
=======
    expect(requests[0]?.action).toBe('uploadFile');
    expect(requests[0]?.body instanceof File).toBe(true);
    expect((requests[0]?.body as File).name).toBe('hello.txt');
>>>>>>> theirs
  });
});
