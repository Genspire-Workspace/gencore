import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('injects the bearer token for authenticated requests', () => {
    const injector = createEnvironmentInjector([
      {
        provide: AuthService,
        useValue: {
          getAccessToken: () => 'access-token',
        },
      },
    ]);

    const request = new HttpRequest('GET', 'http://localhost:3000/file');
    const seen: HttpRequest<unknown>[] = [];

    runInInjectionContext(injector, () => {
      authInterceptor(request, (nextRequest) => {
        seen.push(nextRequest);
        return of({} as never);
      }).subscribe();
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get('Authorization')).toBe(
      'Bearer access-token',
    );
  });
});
