import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionService } from './session.service';

/**
 * Protects app routes. The session is resolved at bootstrap
 * (provideAppInitializer), so this is a synchronous check: authenticated →
 * allow; otherwise redirect to the sign-in screen, preserving the return URL.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isAuthenticated()) return true;
  return router.createUrlTree(['/welcome'], { queryParams: { returnUrl: state.url } });
};
