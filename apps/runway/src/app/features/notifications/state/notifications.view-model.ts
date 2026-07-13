import { Injectable, computed, inject, signal } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import { GetNotificationFeedUseCase } from '../application/use-cases/get-notification-feed.use-case';
import { GetLastSeenUseCase } from '../application/use-cases/get-last-seen.use-case';
import { MarkNotificationsSeenUseCase } from '../application/use-cases/mark-notifications-seen.use-case';

const FEED_LIMIT = 40;

/**
 * NotificationsViewModel — MVVM state for the activity-feed bell. Consumes the
 * live feed + last-seen signals from the query use cases, so the unread badge
 * updates reactively as new events occur. Owns the panel open/close UI state
 * and marks the feed seen on open. Provided at the bell component.
 */
@Injectable()
export class NotificationsViewModel extends ViewModelBase {
  readonly #feedUseCase = inject(GetNotificationFeedUseCase);
  readonly #lastSeenUseCase = inject(GetLastSeenUseCase);
  readonly #markSeenUseCase = inject(MarkNotificationsSeenUseCase);

  readonly #feed = this.#feedUseCase.execute();
  readonly #lastSeen = this.#lastSeenUseCase.execute();

  readonly open = signal(false);
  readonly feed = computed(() => this.#feed().slice(0, FEED_LIMIT));
  readonly unread = computed(() =>
    this.#feed().reduce((n, notification) => (notification.isNewerThan(this.#lastSeen()) ? n + 1 : n), 0),
  );
  readonly unreadLabel = computed(() => (this.unread() > 99 ? '99+' : String(this.unread())));

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.#markSeenUseCase.execute(Date.now());
  }

  close(): void {
    this.open.set(false);
  }
}
