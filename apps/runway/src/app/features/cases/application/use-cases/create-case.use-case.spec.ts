import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CreateCaseUseCase } from './create-case.use-case';
import { CASE_REPOSITORY, type ICaseRepository, type CreateCaseInput } from '../ports/case.repository';
import { Case } from '../../domain/case.entity';
import { ok, fail, isOk, isFail, type Result } from '../../../../shared/kernel/result';
import type { CreateCaseError } from '../../domain/errors/case.errors';
import type { DomainEvent, ReadinessRecord } from '../../../../domain/model';

function validInput(): CreateCaseInput {
  return {
    pathway: 'centre-level', requestType: 'new', processVersion: 'centre-onboarding@1',
    joinerName: 'Aïsha Bello', joinerRef: 'J-1', role: 'Analyst', location: 'Ebène, MU',
    startDate: '2026-08-01', readinessDeadline: '2026-07-30',
    intakeSource: 'Runway intake form', schemaVersion: 'v2',
  };
}

/** Real in-memory interpreter at the repository boundary (no mocks). */
class InMemoryCaseRepository implements ICaseRepository {
  readonly created: Case[] = [];
  async list(): Promise<Case[]> { return this.created; }
  async getByRef(): Promise<Case | null> { return null; }
  async eventsFor(): Promise<DomainEvent[]> { return []; }
  async create(input: CreateCaseInput): Promise<Result<Case, CreateCaseError>> {
    if (!input.joinerRef?.trim()) return fail({ kind: 'InvalidIntake', reason: 'EID required', message: 'Intake incomplete: a valid EID is required.' });
    const rec = { ...input, caseRef: 'RW-' + (this.created.length + 1), state: 'ready-for-orchestration', items: [], blockers: [], owners: {}, createdAt: 'x', updatedAt: 'x' } as unknown as ReadinessRecord;
    const c = new Case(rec);
    this.created.push(c);
    return ok(c);
  }
}

describe('CreateCaseUseCase', () => {
  it('creates a case from a valid intake', async () => {
    TestBed.configureTestingModule({
      providers: [CreateCaseUseCase, { provide: CASE_REPOSITORY, useValue: new InMemoryCaseRepository() }],
    });
    const res = await TestBed.inject(CreateCaseUseCase).execute(validInput());
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.value.caseRef).toBe('RW-1');
  });

  it('returns InvalidIntake when the EID is missing', async () => {
    TestBed.configureTestingModule({
      providers: [CreateCaseUseCase, { provide: CASE_REPOSITORY, useValue: new InMemoryCaseRepository() }],
    });
    const res = await TestBed.inject(CreateCaseUseCase).execute({ ...validInput(), joinerRef: '  ' });
    expect(isFail(res)).toBe(true);
    if (isFail(res)) expect(res.error.kind).toBe('InvalidIntake');
  });
});
