import type { Case } from '../../cases';

/**
 * Overview read model — the dashboard projection over cases + open actions.
 * A reporting DTO, not a persisted entity: it is derived (see overview.builder)
 * from the canonical case set, so it reuses the `Case` domain entity rather than
 * copying its fields.
 */

/** Case counts bucketed by readiness state, for the distribution bar. */
export interface ReadinessDistribution {
  readonly readyOrDone: number;
  readonly inProgress: number;
  readonly waiting: number;
  readonly blocked: number;
}

export interface OverviewSummary {
  readonly openActions: number;
  readonly atRiskCount: number;
  readonly inProgressCount: number;
  readonly readyCount: number;
  /** Average completion confidence across active cases, as a whole percentage. */
  readonly averageReadiness: number;
  readonly distribution: ReadinessDistribution;
  /** The most urgent at-risk cases (by deadline), capped for the panel. */
  readonly atRisk: readonly Case[];
  /** The soonest upcoming Day-1 cases (by start date), capped for the panel. */
  readonly upcoming: readonly Case[];
}
