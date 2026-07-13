import type { Provider } from '@angular/core';
import { ACTION_REPOSITORY } from './application/ports/action.repository';
import { RuntimeActionRepository } from './infrastructure/repositories/runtime-action.repository';

/**
 * Composition-root binding for the actions feature: wire the port to its
 * (in-memory, RuntimeStore-backed) implementation. Add to the app's root
 * providers. Swapping to an HTTP repository later is a one-line change here.
 */
export function provideActionsFeature(): Provider[] {
  return [{ provide: ACTION_REPOSITORY, useExisting: RuntimeActionRepository }];
}
