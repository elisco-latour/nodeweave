import { Injectable } from '@angular/core';
import { loadJson, saveJson } from '../../runtime/persist';
import type { ISessionGateway } from './session.gateway';
import { User } from './user.model';

const SIGNED_OUT_KEY = 'signedOut';

/** The demo operator — stands in for whoever SSO would resolve. */
const MOCK_USER = new User({
  id: 'u-nrughoo',
  name: 'N. Rughoo',
  email: 'n.rughoo@accenture.com',
  org: 'PPSO Operations',
  roles: ['ppso.operator'],
});

/**
 * In-memory session for the mock runtime: authenticated by default; sign-out is
 * remembered (persisted) so it survives a refresh, the way a real cookie session
 * would. Swap for the BffSessionGateway when the backend lands — the
 * SessionService, guard, and UI stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class MockSessionGateway implements ISessionGateway {
  async currentUser(): Promise<User | null> {
    return loadJson<boolean>(SIGNED_OUT_KEY, false) ? null : MOCK_USER;
  }

  async login(): Promise<void> {
    saveJson(SIGNED_OUT_KEY, false);
  }

  async logout(): Promise<void> {
    saveJson(SIGNED_OUT_KEY, true);
  }
}
