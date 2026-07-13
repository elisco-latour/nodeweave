import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OverviewViewModel } from './overview.view-model';
import { GetOverviewUseCase } from '../application/use-cases/get-overview.use-case';
import type { OverviewSummary } from '../domain/overview-summary';

const SUMMARY: OverviewSummary = {
  openActions: 4, atRiskCount: 2, inProgressCount: 1, readyCount: 1, averageReadiness: 60,
  distribution: { readyOrDone: 1, inProgress: 1, waiting: 0, blocked: 2 },
  atRisk: [], upcoming: [],
};

describe('OverviewViewModel', () => {
  it('loads the summary via the use case and exposes it', async () => {
    TestBed.configureTestingModule({
      providers: [
        OverviewViewModel,
        { provide: GetOverviewUseCase, useValue: { execute: async () => SUMMARY } },
      ],
    });
    const vm = TestBed.inject(OverviewViewModel);
    await vm.load();
    expect(vm.summary()?.openActions).toBe(4);
    expect(vm.summary()?.atRiskCount).toBe(2);
    expect(vm.summary()?.averageReadiness).toBe(60);
  });
});
