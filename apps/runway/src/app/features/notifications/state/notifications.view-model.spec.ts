import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationsViewModel } from './notifications.view-model';
import { GetNotificationFeedUseCase } from '../application/use-cases/get-notification-feed.use-case';
import { GetLastSeenUseCase } from '../application/use-cases/get-last-seen.use-case';
import { MarkNotificationsSeenUseCase } from '../application/use-cases/mark-notifications-seen.use-case';
import { Notification } from '../domain/notification.entity';

function at(ms: number): Notification {
  return new Notification({ id: 'n' + ms, caseRef: 'RW-1', type: 'case.created', at: new Date(ms).toISOString(), actor: 'system', summary: 's' });
}

function configure(providers: unknown[]) {
  TestBed.configureTestingModule({ providers: [NotificationsViewModel, ...(providers as never[])] });
  return TestBed.inject(NotificationsViewModel);
}

describe('NotificationsViewModel', () => {
  it('counts unread relative to the last-seen marker', () => {
    const feed = signal([at(3000), at(2000), at(500)]);
    const lastSeen = signal(1000);
    const vm = configure([
      { provide: GetNotificationFeedUseCase, useValue: { execute: () => feed } },
      { provide: GetLastSeenUseCase, useValue: { execute: () => lastSeen } },
      { provide: MarkNotificationsSeenUseCase, useValue: { execute: (a: number) => lastSeen.set(a) } },
    ]);
    expect(vm.unread()).toBe(2); // 3000, 2000 are newer than 1000
    expect(vm.feed().length).toBe(3);
  });

  it('caps the feed at 40 rows', () => {
    const feed = signal(Array.from({ length: 45 }, (_, i) => at(i)));
    const lastSeen = signal(0);
    const vm = configure([
      { provide: GetNotificationFeedUseCase, useValue: { execute: () => feed } },
      { provide: GetLastSeenUseCase, useValue: { execute: () => lastSeen } },
      { provide: MarkNotificationsSeenUseCase, useValue: { execute: () => undefined } },
    ]);
    expect(vm.feed().length).toBe(40);
  });

  it('marks the feed seen on open, clearing the unread count', () => {
    const feed = signal([at(1000)]);
    const lastSeen = signal(0);
    const vm = configure([
      { provide: GetNotificationFeedUseCase, useValue: { execute: () => feed } },
      { provide: GetLastSeenUseCase, useValue: { execute: () => lastSeen } },
      { provide: MarkNotificationsSeenUseCase, useValue: { execute: (a: number) => lastSeen.set(a) } },
    ]);
    expect(vm.unread()).toBe(1);

    vm.toggle();
    expect(vm.open()).toBe(true);
    expect(vm.unread()).toBe(0); // last-seen is now "now", newer than the event
  });
});
