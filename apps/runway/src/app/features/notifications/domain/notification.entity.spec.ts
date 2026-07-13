import { describe, it, expect } from 'vitest';
import { Notification } from './notification.entity';

function at(ms: number): Notification {
  return new Notification({
    id: 'n' + ms, caseRef: 'RW-1', type: 'case.created', at: new Date(ms).toISOString(), actor: 'system', summary: 's',
  });
}

describe('Notification', () => {
  it('exposes the occurrence time as epoch milliseconds', () => {
    const iso = '2026-07-13T10:00:00.000Z';
    const n = new Notification({ id: '1', caseRef: 'RW-1', type: 'case.created', at: iso, actor: 'system', summary: 's' });
    expect(n.occurredAtMs).toBe(Date.parse(iso));
  });

  it('is unread only when newer than the last-seen marker', () => {
    const n = at(2000);
    expect(n.isNewerThan(1000)).toBe(true);
    expect(n.isNewerThan(2000)).toBe(false); // same instant is not "newer"
    expect(n.isNewerThan(3000)).toBe(false);
  });
});
