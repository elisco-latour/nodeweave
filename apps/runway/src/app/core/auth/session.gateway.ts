import { InjectionToken } from '@angular/core';
import type { User } from './user.model';

/**
 * Port for the authentication session. Modelled on the BFF + IdP pattern:
 * the SPA holds no tokens — it probes the BFF for the current user, and sign-in
 * is a full-page redirect through the BFF to the identity provider (SSO).
 */
export interface ISessionGateway {
  /** Resolve the current session — `null` when not authenticated (BFF returns 401). */
  currentUser(): Promise<User | null>;
  /** Begin sign-in. BFF: full-page redirect to the IdP (never resolves). Mock: authenticate in place. */
  login(returnUrl: string): Promise<void>;
  /** End the session (BFF: POST /logout, clearing the HttpOnly cookie). */
  logout(): Promise<void>;
}

export const SESSION_GATEWAY = new InjectionToken<ISessionGateway>('ISessionGateway');
