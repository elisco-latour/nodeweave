import { Injectable, inject, type Signal } from '@angular/core';
import type { Notification } from '../../domain/notification.entity';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository';

/**
 * Live query — returns the reactive feed signal (newest-first). Deliberately not
 * the async `UseCase` contract: the feed is a live projection of the event
 * stream, so callers consume a Signal, not a one-shot Promise.
 */
@Injectable({ providedIn: 'root' })
export class GetNotificationFeedUseCase {
  readonly #repo = inject(NOTIFICATION_REPOSITORY);
  execute(): Signal<Notification[]> {
    return this.#repo.feed();
  }
}
