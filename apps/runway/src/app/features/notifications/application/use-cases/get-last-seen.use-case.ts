import { Injectable, inject, type Signal } from '@angular/core';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository';

/** Live query — the reactive "last seen" marker (epoch ms) that drives unread. */
@Injectable({ providedIn: 'root' })
export class GetLastSeenUseCase {
  readonly #repo = inject(NOTIFICATION_REPOSITORY);
  execute(): Signal<number> {
    return this.#repo.lastSeen();
  }
}
