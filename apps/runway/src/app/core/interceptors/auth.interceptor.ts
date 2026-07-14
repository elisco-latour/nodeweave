import { inject } from '@angular/core';
import { type HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../auth/session.service';

/**
 * BFF auth interceptor. Sends the HttpOnly session cookie with every API call
 * (withCredentials) and, on a 401, treats the session as expired and routes to
 * sign-in. Dormant until the repositories talk HTTP; anti-CSRF is handled by
 * Angular's withXsrfConfiguration (see main.ts).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const withCookie = req.clone({ withCredentials: true });
  return next(withCookie).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        session.handleUnauthorized()
      };
      return throwError(() => err);
    }),
  );
};
