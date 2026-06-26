// file: apps\playground-angular\src\app\features\auth\auth.interceptor.spec.ts

import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('injects the bearer token for authenticated requests', async () => {
    const injector = createEnvironmentInjector([
      {
        provide: AuthService,
        useValue: {
          ensureValidAccessToken: async () => 'access-token',
        },
      },
    ]);

    const request = new HttpRequest('GET', 'http://localhost:3000/file');
    const seen: HttpRequest<unknown>[] = [];

    await runInInjectionContext(injector, async () => {
      await firstValueFrom(authInterceptor(request, (nextRequest) => {
        seen.push(nextRequest);
        return of({} as never);
      }));
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get('Authorization')).toBe(
      'Bearer access-token',
    );
  });
});
