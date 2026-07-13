import { InjectionToken } from '@angular/core';
import type { Case } from '../../../cases';

/**
 * Port for the Overview dashboard. Infallible reads (they throw only on
 * infrastructure failure) — the dashboard is derived, so the aggregation lives
 * in the use case (see overview.builder), not here.
 */
export interface IOverviewRepository {
  listCases(): Promise<Case[]>;
  openActionCount(): Promise<number>;
}

export const OVERVIEW_REPOSITORY = new InjectionToken<IOverviewRepository>('IOverviewRepository');
