import type { Provider } from '@angular/core';
import { NOTIFICATION_REPOSITORY } from './application/ports/notification.repository';
import { RuntimeNotificationRepository } from './infrastructure/repositories/runtime-notification.repository';

/**
 * Composition-root binding for the notifications feature: wire the port to its
 * (RuntimeStore-backed) implementation. Add to the app's root providers.
 * Swapping to an HTTP/SSE repository later is a one-line change here.
 */
export function provideNotificationsFeature(): Provider[] {
  return [{ provide: NOTIFICATION_REPOSITORY, useExisting: RuntimeNotificationRepository }];
}
