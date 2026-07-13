import { Injectable, inject } from '@angular/core';
import { RuntimeService, type NewCaseInput } from '../../../../runtime/runtime.service';
import { ok, fail, type Result } from '../../../../shared/kernel/result';
import type { DomainEvent } from '../../../../domain/model';
import type { ICaseRepository, CreateCaseInput } from '../../application/ports/case.repository';
import type { Case } from '../../domain/case.entity';
import type { CreateCaseError } from '../../domain/errors/case.errors';
import { CaseMapper } from '../mappers/case.mapper';

/**
 * In-memory implementation of ICaseRepository backed by the RuntimeStore (the
 * mock runtime). Swap for an HTTP implementation when the backend lands — the
 * port and everything above it stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeCaseRepository implements ICaseRepository {
  readonly #rt = inject(RuntimeService);

  async list(): Promise<Case[]> {
    return this.#rt.cases().map((c) => CaseMapper.toDomain(c));
  }

  async getByRef(ref: string): Promise<Case | null> {
    const c = this.#rt.caseByRef(ref);
    return c ? CaseMapper.toDomain(c) : null;
  }

  async eventsFor(ref: string): Promise<DomainEvent[]> {
    return this.#rt.eventsFor(ref);
  }

  async create(input: CreateCaseInput): Promise<Result<Case, CreateCaseError>> {
    const invalid = this.#validate(input);
    if (invalid) return fail({ kind: 'InvalidIntake', reason: invalid, message: `Intake incomplete: ${invalid}.` });
    const ref = this.#rt.createCase(input as NewCaseInput);
    const created = this.#rt.caseByRef(ref);
    if (!created) return fail({ kind: 'InvalidIntake', reason: 'case not persisted', message: 'The case could not be created.' });
    return ok(CaseMapper.toDomain(created));
  }

  /** Restate the intake gate at the boundary: every required field must be present. */
  #validate(input: CreateCaseInput): string | null {
    if (!input.joinerName?.trim()) return 'full name is required';
    if (!input.joinerRef?.trim()) return 'a valid EID is required';
    if (!input.role?.trim()) return 'role is required';
    if (!input.location?.trim()) return 'location is required';
    if (!input.startDate) return 'start date is required';
    if (!input.readinessDeadline) return 'readiness deadline is required';
    return null;
  }
}
