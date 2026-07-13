import { Injectable, computed, inject, signal, type Signal } from '@angular/core';
import { RuntimeService } from '../../../../runtime/runtime.service';
import { loadJson, saveJson } from '../../../../runtime/persist';
import type { INotificationRepository } from '../../application/ports/notification.repository';
import type { Notification } from '../../domain/notification.entity';
import { NotificationMapper } from '../mappers/notification.mapper';

const SEEN_KEY = 'notifSeen';

/**
 * Notification repository backed by the RuntimeStore. `feed` is a reactive
 * projection of the shared event stream (newest-first); `lastSeen` is a
 * persisted preference. Swap for an HTTP/SSE implementation when the backend
 * lands — the port and everything above it stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeNotificationRepository implements INotificationRepository {
  readonly #rt = inject(RuntimeService);

  readonly #feed = computed<Notification[]>(() =>
    [...this.#rt.allEvents()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((e) => NotificationMapper.toDomain(e)),
  );
  readonly #lastSeen = signal<number>(loadJson<number>(SEEN_KEY, Date.now()));

  feed(): Signal<Notification[]> {
    return this.#feed;
  }

  lastSeen(): Signal<number> {
    return this.#lastSeen.asReadonly();
  }

  markSeen(at: number): void {
    this.#lastSeen.set(at);
    saveJson(SEEN_KEY, at);
  }
}
