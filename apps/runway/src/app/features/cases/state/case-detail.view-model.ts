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
    const data = await this.executeRead(() => Promise.all([this.#getCase.execute(ref), this.#getEvents.execute(ref)]));
    if (data) {
      this.batchUpdate(() => {
        this.setProperty(this.#case, data[0]);
        this.setProperty(this.#events, data[1]);
      });
    }
  }
}
