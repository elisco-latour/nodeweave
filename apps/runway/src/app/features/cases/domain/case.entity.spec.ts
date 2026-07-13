import { describe, it, expect } from 'vitest';
import { Case } from './case.entity';
import type { ReadinessRecord, ReadinessItem, ReadinessItemState, ReadinessState } from '../../../domain/model';

function item(id: string, state: ReadinessItemState): ReadinessItem {
  return { id, category: 'access', label: id, state, fulfilment: 'auto' };
}

function make(over: Partial<ReadinessRecord> = {}): Case {
  const base: ReadinessRecord = {
    caseRef: 'RW-1', requestType: 'new', pathway: 'centre-level', processVersion: 'centre-onboarding@1',
    joinerRef: 'J-1', joinerName: 'Aïsha Bello', role: 'Analyst', location: 'Ebène, MU',
    intakeSource: 'form', schemaVersion: 'v2', startDate: '2026-07-20', readinessDeadline: '2026-07-18',
    state: 'in-progress', items: [], blockers: [], owners: {}, createdAt: 'x', updatedAt: 'x',
  };
  return new Case({ ...base, ...over });
}

describe('Case', () => {
  it('derives completion confidence from non-skipped items', () => {
    const c = make({ items: [item('a', 'done'), item('b', 'done'), item('c', 'pending'), item('d', 'skipped')] });
    // 2 done of 3 counted (skipped excluded) = 67%
    expect(c.confidencePct).toBe(67);
  });

  it('is overdue when the deadline has passed and it is neither completed nor ready', () => {
    const blocked = make({ readinessDeadline: '2026-07-01', state: 'blocked' as ReadinessState });
    expect(blocked.isOverdue('2026-07-13')).toBe(true);
  });

  it('is not overdue once ready for Day 1, even past the deadline', () => {
    const ready = make({ readinessDeadline: '2026-07-01', state: 'ready-for-day-1' as ReadinessState });
    expect(ready.isOverdue('2026-07-13')).toBe(false);
  });

  it('exposes a human-readable state label', () => {
    expect(make({ state: 'ready-for-day-1' }).stateLabel).toBe('Ready for Day 1');
  });
});
