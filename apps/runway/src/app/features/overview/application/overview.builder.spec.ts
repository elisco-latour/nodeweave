import { describe, it, expect } from 'vitest';
import { buildOverviewSummary } from './overview.builder';
import { Case } from '../../cases';
import type { ReadinessRecord, ReadinessState, ReadinessItem, ReadinessItemState } from '../../../domain/model';

function item(id: string, state: ReadinessItemState): ReadinessItem {
  return { id, category: 'access', label: id, state, fulfilment: 'auto' };
}

function make(ref: string, state: ReadinessState, over: Partial<ReadinessRecord> = {}): Case {
  const base: ReadinessRecord = {
    caseRef: ref, requestType: 'new', pathway: 'centre-level', processVersion: 'p@1',
    joinerRef: 'J-' + ref, joinerName: 'Name ' + ref, role: 'Analyst', location: 'Ebène, MU',
    intakeSource: 'form', schemaVersion: 'v2', startDate: '2026-08-01', readinessDeadline: '2026-08-01',
    state, items: [], blockers: [], owners: {}, createdAt: 'x', updatedAt: 'x',
  };
  return new Case({ ...base, ...over });
}

const ASOF = '2026-07-13';

describe('buildOverviewSummary', () => {
  it('counts open actions, at-risk, in-progress and ready buckets', () => {
    const cases = [
      make('1', 'blocked'),
      make('2', 'ready-for-day-1'),
      make('3', 'in-progress'),
      make('4', 'completed'),
    ];
    const s = buildOverviewSummary(cases, 7, ASOF);
    expect(s.openActions).toBe(7);
    expect(s.atRiskCount).toBe(1); // the blocked one
    expect(s.inProgressCount).toBe(1);
    expect(s.readyCount).toBe(1);
    expect(s.distribution.readyOrDone).toBe(2); // ready + completed
    expect(s.distribution.blocked).toBe(1);
  });

  it('averages readiness over active cases only (excludes completed/cancelled)', () => {
    const cases = [
      make('1', 'in-progress', { items: [item('a', 'done'), item('b', 'pending')] }), // 50%
      make('2', 'in-progress', { items: [item('a', 'done'), item('b', 'done')] }),     // 100%
      make('3', 'completed', { items: [item('a', 'pending')] }),                        // excluded
    ];
    // (50 + 100) / 2 = 75
    expect(buildOverviewSummary(cases, 0, ASOF).averageReadiness).toBe(75);
  });

  it('sorts at-risk by deadline and upcoming by start date, capped at five', () => {
    const cases = [
      make('a', 'blocked', { readinessDeadline: '2026-09-01', startDate: '2026-07-01' }), // already started
      make('b', 'blocked', { readinessDeadline: '2026-07-20', startDate: '2026-07-02' }), // already started
      make('c', 'ready-for-day-1', { startDate: '2026-08-10' }),
      make('d', 'in-progress', { startDate: '2026-07-15' }),
      make('e', 'completed', { startDate: '2026-07-14' }), // excluded from upcoming
    ];
    const s = buildOverviewSummary(cases, 0, ASOF);
    expect(s.atRisk.map((c) => c.caseRef)).toEqual(['b', 'a']); // earliest deadline first
    expect(s.upcoming.map((c) => c.caseRef)).toEqual(['d', 'c']); // earliest start first, no completed
  });
});
