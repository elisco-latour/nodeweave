import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { DomainEvent } from '../../../../domain/model';
import { CASE_REPOSITORY } from '../ports/case.repository';

@Injectable({ providedIn: 'root' })
export class GetCaseEventsUseCase implements UseCase<string, DomainEvent[]> {
  readonly #repo = inject(CASE_REPOSITORY);
  execute(ref: string): Promise<DomainEvent[]> {
    return this.#repo.eventsFor(ref);
  }
}
