import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { OverviewSummary } from '../../domain/overview-summary';
import { OVERVIEW_REPOSITORY } from '../ports/overview.repository';
import { buildOverviewSummary } from '../overview.builder';

/**
 * Compose the dashboard: read the case set and the open-action count, then
 * project them into the OverviewSummary read model.
 */
@Injectable({ providedIn: 'root' })
export class GetOverviewUseCase implements UseCase<void, OverviewSummary> {
  readonly #repo = inject(OVERVIEW_REPOSITORY);
  async execute(): Promise<OverviewSummary> {
    const [cases, openActions] = await Promise.all([this.#repo.listCases(), this.#repo.openActionCount()]);
    return buildOverviewSummary(cases, openActions, new Date().toISOString().slice(0, 10));
  }
}
