import { Injectable, inject } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import type { DomainEvent } from '../../../domain/model';
import type { Case } from '../domain/case.entity';
import { GetCaseUseCase } from '../application/use-cases/get-case.use-case';
import { GetCaseEventsUseCase } from '../application/use-cases/get-case-events.use-case';

/**
 * CaseDetailViewModel — MVVM state for one case's readiness view. Loads the
 * case and its activity stream together. Provided at the case-detail route.
 */
@Injectable()
export class CaseDetailViewModel extends ViewModelBase {
  readonly #getCase = inject(GetCaseUseCase);
  readonly #getEvents = inject(GetCaseEventsUseCase);

  readonly #case = this.state<Case | null>(null);
  readonly #events = this.state<DomainEvent[]>([]);
  readonly case = this.#case.asReadonly();
  readonly events = this.#events.asReadonly();

  async load(ref: string): Promise<void> {
    const [c, ev] = await Promise.all([this.#getCase.execute(ref), this.#getEvents.execute(ref)]);
    this.batchUpdate(() => {
      this.setProperty(this.#case, c);
      this.setProperty(this.#events, ev);
    });
  }
}
