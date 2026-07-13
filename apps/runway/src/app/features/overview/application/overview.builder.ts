import { matchesFilter, type Case } from '../../cases';
import type { OverviewSummary } from '../domain/overview-summary';

/** How many rows each dashboard panel shows. */
const PANEL_LIMIT = 5;

/**
 * Build the Overview read model from the case set and the open-action count.
 * Pure, framework-free application logic — the aggregation a real backend would
 * do behind GET /overview. Reuses the cases slice's `at-risk` classification so
 * the dashboard and the Cases filter can never disagree.
 *
 * @param asOf ISO date (yyyy-mm-dd) used as "today" for the upcoming cut-off.
 */
export function buildOverviewSummary(cases: Case[], openActions: number, asOf: string): OverviewSummary {
  const active = cases.filter((c) => !c.isCompleted && !c.isCancelled);
  const averageReadiness = active.length
    ? Math.round((active.reduce((sum, c) => sum + c.confidence, 0) / active.length) * 100)
    : 0;

  const atRisk = cases
    .filter((c) => matchesFilter(c.record, 'at-risk'))
    .sort((a, b) => a.readinessDeadline.localeCompare(b.readinessDeadline));

  const upcoming = cases
    .filter((c) => c.startDate >= asOf && !c.isCompleted && !c.isCancelled)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const count = (predicate: (c: Case) => boolean) => cases.filter(predicate).length;

  return {
    openActions,
    atRiskCount: atRisk.length,
    inProgressCount: count((c) => c.state === 'in-progress'),
    readyCount: count((c) => c.state === 'ready-for-day-1'),
    averageReadiness,
    distribution: {
      readyOrDone: count((c) => c.state === 'ready-for-day-1' || c.state === 'completed'),
      inProgress: count((c) => c.state === 'in-progress' || c.state === 'ready-for-orchestration'),
      waiting: count((c) => c.state === 'waiting-for-info'),
      blocked: count((c) => c.state === 'blocked' || c.state === 'exception'),
    },
    atRisk: atRisk.slice(0, PANEL_LIMIT),
    upcoming: upcoming.slice(0, PANEL_LIMIT),
  };
}
