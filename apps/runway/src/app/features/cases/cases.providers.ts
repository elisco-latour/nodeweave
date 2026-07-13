import type { Provider } from '@angular/core';
import { CASE_REPOSITORY } from './application/ports/case.repository';
import { RuntimeCaseRepository } from './infrastructure/repositories/runtime-case.repository';

/**
 * Composition-root binding for the cases feature: wire the port to its
 * (in-memory, RuntimeStore-backed) implementation. Add to the app's root
 * providers. Swapping to an HTTP repository later is a one-line change here.
 */
export function provideCasesFeature(): Provider[] {
  return [{ provide: CASE_REPOSITORY, useExisting: RuntimeCaseRepository }];
}
