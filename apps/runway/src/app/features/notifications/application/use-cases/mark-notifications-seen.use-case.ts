import { Injectable, inject } from '@angular/core';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository';

/** Command — persist the last-seen marker. Infallible (a preference write). */
@Injectable({ providedIn: 'root' })
export class MarkNotificationsSeenUseCase {
  readonly #repo = inject(NOTIFICATION_REPOSITORY);
  execute(at: number): void {
    this.#repo.markSeen(at);
  }
}
