import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ResolveActionUseCase } from './resolve-action.use-case';
import { ACTION_REPOSITORY, type IActionRepository } from '../ports/action.repository';
import { Action, type ActionStatus } from '../../domain/action.entity';
import { ok, fail, isOk, isFail, type Result } from '../../../../shared/kernel/result';
import type { ResolveActionError, DismissActionError } from '../../domain/errors/action.errors';

function make(id: string, status: ActionStatus): Action {
  return new Action({ id, caseRef: 'RW-' + id, kind: 'triage', title: id, reason: 'r', impactedItems: [], createdAt: 'x', status, joinerName: 'J' });
}

/** Real in-memory interpreter at the repository boundary (no mocks). */
class InMemoryActionRepository implements IActionRepository {
  constructor(private readonly items: Action[]) {}
  async list(): Promise<Action[]> { return this.items; }
  async getById(id: string): Promise<Action | null> { return this.items.find((a) => a.id === id) ?? null; }
  async resolve(id: string): Promise<Result<Action, ResolveActionError>> {
    const a = this.items.find((x) => x.id === id);
    if (!a) return fail({ kind: 'ActionNotFound', id, message: 'not found' });
    if (!a.isOpen) return fail({ kind: 'AlreadyClosed', id, message: `This action was already ${a.status}.` });
    return ok(a);
  }
  async dismiss(id: string): Promise<Result<Action, DismissActionError>> {
    const a = this.items.find((x) => x.id === id);
    if (!a) return fail({ kind: 'ActionNotFound', id, message: 'not found' });
    if (!a.isOpen) return fail({ kind: 'AlreadyClosed', id, message: `This action was already ${a.status}.` });
    return ok(a);
  }
}

describe('ResolveActionUseCase', () => {
  it('resolves an open action', async () => {
    TestBed.configureTestingModule({
      providers: [ResolveActionUseCase, { provide: ACTION_REPOSITORY, useValue: new InMemoryActionRepository([make('A1', 'open')]) }],
    });
    const res = await TestBed.inject(ResolveActionUseCase).execute('A1');
    expect(isOk(res)).toBe(true);
  });

  it('returns AlreadyClosed when the action is already resolved', async () => {
    TestBed.configureTestingModule({
      providers: [ResolveActionUseCase, { provide: ACTION_REPOSITORY, useValue: new InMemoryActionRepository([make('A1', 'resolved')]) }],
    });
    const res = await TestBed.inject(ResolveActionUseCase).execute('A1');
    expect(isFail(res)).toBe(true);
    if (isFail(res)) expect(res.error.kind).toBe('AlreadyClosed');
  });

  it('returns ActionNotFound for an unknown id', async () => {
    TestBed.configureTestingModule({
      providers: [ResolveActionUseCase, { provide: ACTION_REPOSITORY, useValue: new InMemoryActionRepository([]) }],
    });
    const res = await TestBed.inject(ResolveActionUseCase).execute('nope');
    expect(isFail(res)).toBe(true);
    if (isFail(res)) expect(res.error.kind).toBe('ActionNotFound');
  });
});
