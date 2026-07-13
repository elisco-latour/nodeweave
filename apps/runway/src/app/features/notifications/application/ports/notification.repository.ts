import { InjectionToken, type Signal } from '@angular/core';
import type { Notification } from '../../domain/notification.entity';

/**
 * Port for the notifications feed. This is a *live query*: `feed` and `lastSeen`
 * return reactive Signals (the feed is a projection of the event stream, which
 * changes as the app runs), so the bell badge stays live. `markSeen` is an
 * infallible preference write — no Result needed.
 */
export interface INotificationRepository {
  /** Live, newest-first feed. */
  feed(): Signal<Notification[]>;
  /** The persisted "last seen" marker (epoch ms), reactive. */
  lastSeen(): Signal<number>;
  /** Persist the last-seen marker. */
  markSeen(at: number): void;
}

export const NOTIFICATION_REPOSITORY = new InjectionToken<INotificationRepository>('INotificationRepository');
