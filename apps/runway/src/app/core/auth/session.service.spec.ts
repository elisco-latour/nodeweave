import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { SESSION_GATEWAY, type ISessionGateway } from './session.gateway';
import { User } from './user.model';

const USER = new User({ id: '1', name: 'N. Rughoo', email: 'n.rughoo@accenture.com', org: 'PPSO Operations', roles: ['ppso.operator'] });

class StubGateway implements ISessionGateway {
  signedIn = true;
  loginCalls = 0;
  async currentUser(): Promise<User | null> { return this.signedIn ? USER : null; }
  async login(): Promise<void> { this.loginCalls++; this.signedIn = true; }
  async logout(): Promise<void> { this.signedIn = false; }
}

function configure(gateway: ISessionGateway) {
  const router = { navigate: vi.fn(), navigateByUrl: vi.fn(), url: '/cases' } as unknown as Router;
  TestBed.configureTestingModule({
    providers: [
      SessionService,
      { provide: SESSION_GATEWAY, useValue: gateway },
      { provide: Router, useValue: router },
    ],
  });
  return { session: TestBed.inject(SessionService), router };
}

describe('SessionService', () => {
  it('loads the current user and becomes ready', async () => {
    const { session } = configure(new StubGateway());
    expect(session.isReady()).toBe(false);
    await session.load();
    expect(session.isReady()).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
    expect(session.user()?.initials).toBe('NR');
  });

  it('is unauthenticated when the gateway has no session', async () => {
    const gateway = new StubGateway();
    gateway.signedIn = false;
    const { session } = configure(gateway);
    await session.load();
    expect(session.isAuthenticated()).toBe(false);
    expect(session.user()).toBeNull();
  });

  it('signs in and returns to the requested url', async () => {
    const gateway = new StubGateway();
    gateway.signedIn = false;
    const { session, router } = configure(gateway);
    await session.load();
    await session.login('/cases');
    expect(gateway.loginCalls).toBe(1);
    expect(session.isAuthenticated()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cases');
  });

  it('signs out and routes to the welcome screen', async () => {
    const { session, router } = configure(new StubGateway());
    await session.load();
    await session.logout();
    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
  });
});
