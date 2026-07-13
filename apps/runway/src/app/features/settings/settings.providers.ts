import type { Provider } from '@angular/core';
import { SETTINGS_REPOSITORY } from './application/ports/settings.repository';
import { RuntimeSettingsRepository } from './infrastructure/repositories/runtime-settings.repository';

/**
 * Composition-root binding for the settings feature: wire the port to its
 * (preference-store-backed) implementation. Add to the app's root providers.
 * Swapping to an HTTP repository later is a one-line change here.
 */
export function provideSettingsFeature(): Provider[] {
  return [{ provide: SETTINGS_REPOSITORY, useExisting: RuntimeSettingsRepository }];
}
