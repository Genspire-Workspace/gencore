import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
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
        method: 'GET',
        url: 'http://localhost:3000/file',
      },
    ]);
  });

  it('uploads multipart form data with a file field', async () => {
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
              id: 'file-1',
              bucket: 'uploads',
              key: 'hello.txt',
              originalName: 'hello.txt',
              size: 5,
              createdAt: '2026-06-26T00:00:00.000Z',
              updatedAt: '2026-06-26T00:00:00.000Z',
            });
          },
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
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://localhost:3000/file');
    expect(requests[0]?.body instanceof FormData).toBe(true);

    const uploaded = (requests[0]?.body as FormData).get('file');
    expect(uploaded instanceof File).toBe(true);
    expect((uploaded as File).name).toBe('hello.txt');
  });
});
