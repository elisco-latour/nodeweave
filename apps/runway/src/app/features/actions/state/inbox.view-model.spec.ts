import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InboxViewModel } from './inbox.view-model';
import { ListActionsUseCase } from '../application/use-cases/list-actions.use-case';
import { ResolveActionUseCase } from '../application/use-cases/resolve-action.use-case';
import { DismissActionUseCase } from '../application/use-cases/dismiss-action.use-case';
import { Action, type ActionStatus } from '../domain/action.entity';
import { ok, fail } from '../../../shared/kernel/result';
import type { ActionKind } from '../../../domain/model';

function make(id: string, status: ActionStatus, kind: ActionKind = 'triage', createdAt = '2026-01-0' + id): Action {
  return new Action({ id, caseRef: 'RW-' + id, kind, title: id, reason: 'r', impactedItems: [], createdAt, status, joinerName: 'J' });
}

function configure(providers: unknown[]) {
  TestBed.configureTestingModule({ providers: [InboxViewModel, ...(providers as never[])] });
  return TestBed.inject(InboxViewModel);
}

describe('InboxViewModel', () => {
  it('loads actions, computes counts, and filters by the Pending tab', async () => {
    const vm = configure([
      { provide: ListActionsUseCase, useValue: { execute: async () => [make('1', 'open'), make('2', 'resolved')] } },
      { provide: ResolveActionUseCase, useValue: { execute: async () => ok(make('1', 'resolved')) } },
      { provide: DismissActionUseCase, useValue: { execute: async () => ok(make('1', 'dismissed')) } },
    ]);
    await vm.load();
    expect(vm.allCount()).toBe(2);
    expect(vm.pendingCount()).toBe(1);

    vm.tab.set('pending');
    expect(vm.visible().length).toBe(1);
    expect(vm.visible()[0].id).toBe('1');
  });

  it('surfaces the domain error message when a resolve fails', async () => {
    const vm = configure([
      { provide: ListActionsUseCase, useValue: { execute: async () => [make('1', 'resolved')] } },
      { provide: ResolveActionUseCase, useValue: { execute: async () => fail({ kind: 'AlreadyClosed', id: '1', message: 'This action was already resolved.' }) } },
      { provide: DismissActionUseCase, useValue: { execute: async () => ok(make('1', 'dismissed')) } },
    ]);
    await vm.resolve('1');
    expect(vm.error()).toBe('This action was already resolved.');
  });
});
