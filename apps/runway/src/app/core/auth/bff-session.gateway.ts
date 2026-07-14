import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ISessionGateway } from './session.gateway';
import { User } from './user.model';

interface UserDto {
  id: string;
  name: string;
  email: string;
  org: string;
  roles: string[];
}

/**
 * Real session gateway for the BFF + IdP (SSO) model. NOT active yet — bound in
 * place of MockSessionGateway once the backend exists (see auth.providers).
 * Unverified against a live BFF; written to the intended contract:
 *
 *  - currentUser(): GET {bff}/user with the HttpOnly cookie (withCredentials);
 *    a 401 means "not signed in" → null.
 *  - login(): full-page redirect to {bff}/login, which drives the IdP and
 *    redirects back with the session cookie set. Never resolves.
 *  - logout(): POST {bff}/logout to clear the cookie, then land on the app root.
 *
 * The SPA never sees or stores tokens.
 */
@Injectable({ providedIn: 'root' })
export class BffSessionGateway implements ISessionGateway {
  readonly #http = inject(HttpClient);
  readonly #base = '/bff';

  async currentUser(): Promise<User | null> {
    try {
      const dto = await firstValueFrom(this.#http.get<UserDto>(`${this.#base}/user`, { withCredentials: true }));
      return new User({ id: dto.id, name: dto.name, email: dto.email, org: dto.org, roles: dto.roles });
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) return null;
      throw e;
    }
  }

  login(returnUrl: string): Promise<void> {
    window.location.assign(`${this.#base}/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    return new Promise<void>(() => { /* navigating away — never resolves */ });
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.#http.post(`${this.#base}/logout`, {}, { withCredentials: true }));
  }
}
