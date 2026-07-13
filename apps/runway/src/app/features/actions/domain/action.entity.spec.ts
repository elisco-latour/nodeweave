import { describe, it, expect } from 'vitest';
import { Action, type ActionStatus } from './action.entity';
import { DomainError } from '../../../shared/kernel/domain-error';

function make(status: ActionStatus): Action {
  return new Action({
    id: 'A1', caseRef: 'RW-1', kind: 'triage', title: 'Missing EID', reason: 'r',
    impactedItems: ['access'], createdAt: '2026-01-01T00:00:00Z', status, joinerName: 'Jane Doe',
  });
}

describe('Action entity', () => {
  it('an open action is actionable', () => {
    const a = make('open');
    expect(a.isOpen).toBe(true);
    expect(a.isActionable).toBe(true);
    expect(() => a.ensureActionable()).not.toThrow();
  });

  it('a resolved action is not actionable and ensureActionable throws DomainError', () => {
    const a = make('resolved');
    expect(a.isActionable).toBe(false);
    expect(a.isResolved).toBe(true);
    expect(() => a.ensureActionable()).toThrow(DomainError);
  });

  it('exposes denormalised joiner name for display', () => {
    expect(make('open').joinerName).toBe('Jane Doe');
  });
});
