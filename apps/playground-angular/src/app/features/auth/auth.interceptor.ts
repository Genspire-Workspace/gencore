import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

function shouldSkipAuth(url: string): boolean {
  return (
    url.endsWith('/login') ||
    url.endsWith('/register') ||
    url.endsWith('/refresh') ||
    url.endsWith('/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (shouldSkipAuth(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);

  return from(authService.ensureValidAccessToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(request);
      }

      return next(
        request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
    }),
  );
};
