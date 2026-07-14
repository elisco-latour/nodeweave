import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SESSION_GATEWAY } from './session.gateway';
import type { User } from './user.model';

/**
 * SessionService — the app's cross-cutting authentication state. Loaded once at
 * bootstrap (provideAppInitializer). Holds the current user; drives sign-in
 * (BFF redirect) and sign-out through the gateway. Consumed by the auth guard,
 * the interceptor (on 401), and the shell user menu.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly #gateway = inject(SESSION_GATEWAY);
  readonly #router = inject(Router);

  readonly #user = signal<User | null>(null);
  readonly #ready = signal(false);

  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);
  /** True once the initial session probe has completed. */
  readonly isReady = this.#ready.asReadonly();

  /** Probe the current session. Runs at startup before routing. */
  async load(): Promise<void> {
    try {
      this.#user.set(await this.#gateway.currentUser());
    } catch {
      this.#user.set(null);
    } finally {
      this.#ready.set(true);
    }
  }

  /** Begin sign-in, then return to `returnUrl`. On the BFF the redirect wins and the rest never runs. */
  async login(returnUrl = '/home'): Promise<void> {
    await this.#gateway.login(returnUrl);
    await this.load();
    if (this.isAuthenticated()) this.#router.navigateByUrl(returnUrl);
  }

  async logout(): Promise<void> {
    await this.#gateway.logout();
    this.#user.set(null);
    this.#router.navigate(['/welcome']);
  }

  /** Called by the interceptor when the BFF returns 401 (session expired). */
  handleUnauthorized(): void {
    this.#user.set(null);
    this.#router.navigate(['/welcome'], { queryParams: { returnUrl: this.#router.url } });
  }
}
