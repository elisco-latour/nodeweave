import type { Provider } from '@angular/core';
import { OVERVIEW_REPOSITORY } from './application/ports/overview.repository';
import { RuntimeOverviewRepository } from './infrastructure/repositories/runtime-overview.repository';

/**
 * Composition-root binding for the overview feature: wire the port to its
 * (in-memory, RuntimeStore-backed) implementation. Add to the app's root
 * providers. Swapping to an HTTP repository later is a one-line change here.
 */
export function provideOverviewFeature(): Provider[] {
  return [{ provide: OVERVIEW_REPOSITORY, useExisting: RuntimeOverviewRepository }];
}
