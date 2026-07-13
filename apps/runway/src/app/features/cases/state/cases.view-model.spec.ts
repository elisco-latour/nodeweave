import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CasesViewModel } from './cases.view-model';
import { ListCasesUseCase } from '../application/use-cases/list-cases.use-case';
import { CreateCaseUseCase } from '../application/use-cases/create-case.use-case';
import { Case } from '../domain/case.entity';
import { ok, fail } from '../../../shared/kernel/result';
import type { ReadinessRecord, ReadinessState } from '../../../domain/model';

function make(ref: string, state: ReadinessState): Case {
  return new Case({
    caseRef: ref, requestType: 'new', pathway: 'centre-level', processVersion: 'p@1',
    joinerRef: 'J-' + ref, joinerName: 'Name ' + ref, role: 'Analyst', location: 'Ebène, MU',
    intakeSource: 'form', schemaVersion: 'v2', startDate: '2026-08-01', readinessDeadline: '2026-08-01',
    state, items: [], blockers: [], owners: {}, createdAt: 'x', updatedAt: 'x',
  } as ReadinessRecord);
}

function configure(providers: unknown[]) {
  TestBed.configureTestingModule({ providers: [CasesViewModel, ...(providers as never[])] });
  return TestBed.inject(CasesViewModel);
}

describe('CasesViewModel', () => {
  it('loads cases and derives per-filter counts and the current page', async () => {
    const vm = configure([
      { provide: ListCasesUseCase, useValue: { execute: async () => [make('1', 'blocked'), make('2', 'ready-for-day-1'), make('3', 'in-progress')] } },
      { provide: CreateCaseUseCase, useValue: { execute: async () => ok(make('9', 'in-progress')) } },
    ]);
    await vm.load();
    expect(vm.counts().all).toBe(3);
    expect(vm.counts().blocked).toBe(1);
    expect(vm.result().rows.length).toBe(3);

    vm.setFilter('blocked');
    expect(vm.result().rows.map((c) => c.caseRef)).toEqual(['1']);
  });

  it('surfaces the domain error message when create fails', async () => {
    const vm = configure([
      { provide: ListCasesUseCase, useValue: { execute: async () => [] } },
      { provide: CreateCaseUseCase, useValue: { execute: async () => fail({ kind: 'InvalidIntake', reason: 'EID', message: 'Intake incomplete: a valid EID is required.' }) } },
    ]);
    const created = await vm.create({} as never);
    expect(created).toBeNull();
    expect(vm.error()).toBe('Intake incomplete: a valid EID is required.');
  });
});
