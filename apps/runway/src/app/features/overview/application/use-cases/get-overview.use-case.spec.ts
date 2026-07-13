import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GetOverviewUseCase } from './get-overview.use-case';
import { OVERVIEW_REPOSITORY, type IOverviewRepository } from '../ports/overview.repository';
import { Case } from '../../../cases';
import type { ReadinessRecord, ReadinessState } from '../../../../domain/model';

function make(ref: string, state: ReadinessState): Case {
  return new Case({
    caseRef: ref, requestType: 'new', pathway: 'centre-level', processVersion: 'p@1',
    joinerRef: 'J-' + ref, joinerName: 'Name ' + ref, role: 'Analyst', location: 'Ebène, MU',
    intakeSource: 'form', schemaVersion: 'v2', startDate: '2026-08-01', readinessDeadline: '2026-08-01',
    state, items: [], blockers: [], owners: {}, createdAt: 'x', updatedAt: 'x',
  } as ReadinessRecord);
}

/** Real in-memory interpreter at the repository boundary (no mocks). */
class InMemoryOverviewRepository implements IOverviewRepository {
  constructor(private readonly cases: Case[], private readonly actions: number) {}
  async listCases(): Promise<Case[]> { return this.cases; }
  async openActionCount(): Promise<number> { return this.actions; }
}

describe('GetOverviewUseCase', () => {
  it('composes the repository reads into a summary', async () => {
    TestBed.configureTestingModule({
      providers: [
        GetOverviewUseCase,
        { provide: OVERVIEW_REPOSITORY, useValue: new InMemoryOverviewRepository([make('1', 'blocked'), make('2', 'ready-for-day-1')], 3) },
      ],
    });
    const summary = await TestBed.inject(GetOverviewUseCase).execute();
    expect(summary.openActions).toBe(3);
    expect(summary.atRiskCount).toBe(1);
    expect(summary.readyCount).toBe(1);
  });
});
