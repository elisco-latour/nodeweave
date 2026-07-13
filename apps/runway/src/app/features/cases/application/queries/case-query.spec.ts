import { describe, it, expect } from 'vitest';
import { queryCases, countByFilter } from './case-query';
import { Case } from '../../domain/case.entity';
import type { ReadinessRecord, ReadinessState } from '../../../../domain/model';

function make(ref: string, state: ReadinessState, over: Partial<ReadinessRecord> = {}): Case {
  const base: ReadinessRecord = {
    caseRef: ref, requestType: 'new', pathway: 'centre-level', processVersion: 'p@1',
    joinerRef: 'J-' + ref, joinerName: 'Name ' + ref, role: 'Analyst', location: 'Ebène, MU',
    intakeSource: 'form', schemaVersion: 'v2', startDate: '2026-08-01', readinessDeadline: '2026-08-01',
    state, items: [], blockers: [], owners: {}, createdAt: '2026-07-0' + ref.slice(-1), updatedAt: 'x',
  };
  return new Case({ ...base, ...over });
}

describe('case-query', () => {
  const cases = [
    make('1', 'blocked'),
    make('2', 'ready-for-day-1'),
    make('3', 'completed'),
    make('4', 'in-progress'),
  ];

  it('filters to the blocked set', () => {
    const page = queryCases(cases, { filter: 'blocked' });
    expect(page.rows.map((c) => c.caseRef)).toEqual(['1']);
    expect(page.matched).toBe(1);
  });

  it('searches across joiner, ref, role and state', () => {
    const page = queryCases(cases, { search: 'RW... ' });
    expect(queryCases(cases, { search: 'name 2' }).rows.map((c) => c.caseRef)).toEqual(['2']);
    expect(page.total).toBe(4);
  });

  it('paginates and clamps the page index', () => {
    const page = queryCases(cases, { pageSize: 2, page: 9 });
    expect(page.pageSize).toBe(2);
    expect(page.pageCount).toBe(2);
    expect(page.page).toBe(1); // clamped to last page
    expect(page.rows.length).toBe(2);
  });

  it('counts by filter bucket', () => {
    const counts = countByFilter(cases);
    expect(counts.all).toBe(4);
    expect(counts.blocked).toBe(1);
    expect(counts.ready).toBe(1);
    expect(counts.completed).toBe(1);
  });
});
