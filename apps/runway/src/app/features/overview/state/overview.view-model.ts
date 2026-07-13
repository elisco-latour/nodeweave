import { Injectable, inject } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import type { OverviewSummary } from '../domain/overview-summary';
import { GetOverviewUseCase } from '../application/use-cases/get-overview.use-case';

/**
 * OverviewViewModel — MVVM state for the dashboard. Loads the summary read
 * model once via the use case and exposes it as a read-only signal. Provided at
 * the home route.
 */
@Injectable()
export class OverviewViewModel extends ViewModelBase {
  readonly #getOverview = inject(GetOverviewUseCase);

  readonly #summary = this.state<OverviewSummary | null>(null);
  readonly summary = this.#summary.asReadonly();

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    this.setProperty(this.#summary, await this.#getOverview.execute());
  }
}
