import type { Provider } from '@angular/core';
import { SESSION_GATEWAY } from './session.gateway';
import { MockSessionGateway } from './mock-session.gateway';

/**
 * Composition-root binding for authentication. Bound to the in-memory mock
 * gateway; switch `useExisting` to `BffSessionGateway` when the BFF exists —
 * nothing else changes (the SPA never handled tokens).
 */
export function provideAuth(): Provider[] {
  return [{ provide: SESSION_GATEWAY, useExisting: MockSessionGateway }];
}
