import { InjectionToken } from '@angular/core';
import type { Result } from '../../../../shared/kernel/result';
import type { DomainEvent, Pathway, RequestType } from '../../../../domain/model';
import type { Case } from '../../domain/case.entity';
import type { CreateCaseError } from '../../domain/errors/case.errors';

/**
 * The validated structured-intake payload for a new case (the mock's POST
 * /intake body). Owned by the Application layer so nothing above infrastructure
 * depends on the RuntimeService's shape.
 */
export interface CreateCaseInput {
  pathway: Pathway;
  requestType: RequestType;
  processVersion: string;
  joinerName: string;
  joinerRef: string; // EID
  role: string;
  location: string;
  startDate: string;
  readinessDeadline: string;
  intakeSource: string;
  schemaVersion: string;
}

/**
 * Port for the Cases registry. `list`/`getByRef`/`eventsFor` are infallible
 * reads (they throw only on infrastructure failure); `create` returns a
 * `Result` because an invalid intake is a business outcome the caller handles.
 */
export interface ICaseRepository {
  list(): Promise<Case[]>;
  getByRef(ref: string): Promise<Case | null>;
  eventsFor(ref: string): Promise<DomainEvent[]>;
  create(input: CreateCaseInput): Promise<Result<Case, CreateCaseError>>;
}

export const CASE_REPOSITORY = new InjectionToken<ICaseRepository>('ICaseRepository');
