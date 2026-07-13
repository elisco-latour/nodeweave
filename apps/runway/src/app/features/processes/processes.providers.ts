import type { Provider } from '@angular/core';
import { PROCESS_REPOSITORY } from './application/ports/process.repository';
import { RuntimeProcessRepository } from './infrastructure/repositories/runtime-process.repository';

/**
 * Composition-root binding for the processes feature: wire the port to its
 * (ProcessStore-backed) implementation. Add to the app's root providers.
 * Swapping to an HTTP repository later is a one-line change here.
 */
export function provideProcessesFeature(): Provider[] {
  return [{ provide: PROCESS_REPOSITORY, useExisting: RuntimeProcessRepository }];
}
