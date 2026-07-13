import type { ReadinessRecord, ReadinessState } from '../../../../domain/model';
import type { Case } from '../../domain/case.entity';

/**
 * Case querying — filter, search, sort, and paginate the case set. This is the
 * shape a real backend would expose as GET /cases?filter=&sort=&page= ; the
 * table view goes through it so the API seam is honest and the client never has
 * to render more than a page. Pure, framework-free application logic operating
 * on domain `Case` entities.
 */
export type CaseFilterId = 'all' | 'at-risk' | 'blocked' | 'ready' | 'completed';
export type CaseSortId = 'deadline' | 'readiness' | 'created' | 'name';

export const FILTERS: { id: CaseFilterId; label: string }[] = [
  { id: 'all', label: 'All cases' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];
export const SORTS: { id: CaseSortId; label: string }[] = [
  { id: 'deadline', label: 'Ready by' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'created', label: 'Newest' },
  { id: 'name', label: 'Name' },
];

export interface CaseQuery {
  search?: string;
  filter?: CaseFilterId;
  sort?: CaseSortId;
  page?: number; // 0-based
  pageSize?: number;
}
export interface CasePage {
  rows: Case[];
  total: number; // all records
  matched: number; // after filter + search
  page: number; // clamped 0-based
  pageSize: number;
  pageCount: number;
}

const AT_RISK_STATES: ReadinessState[] = ['blocked', 'exception', 'waiting-for-info'];
const TODAY = new Date().toISOString().slice(0, 10);

function overdue(state: ReadinessState, deadline: string): boolean {
  return deadline < TODAY && state !== 'completed' && state !== 'ready-for-day-1';
}

/**
 * Filter predicate. Accepts the raw `ReadinessRecord` (not the `Case` entity)
 * so legacy, not-yet-migrated surfaces (the Overview dashboard) can reuse the
 * exact same classification during the strangler migration.
 */
export function matchesFilter(c: ReadinessRecord, f: CaseFilterId): boolean {
  switch (f) {
    case 'all': return true;
    case 'at-risk': return AT_RISK_STATES.includes(c.state) || overdue(c.state, c.readinessDeadline);
    case 'blocked': return c.state === 'blocked' || c.state === 'exception';
    case 'ready': return c.state === 'ready-for-day-1';
    case 'completed': return c.state === 'completed';
  }
}

function matchesSearch(c: Case, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = [c.caseRef, c.joinerName, c.role, c.location, c.pathway, c.state].join(' ').toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function comparator(sort: CaseSortId): (a: Case, b: Case) => number {
  switch (sort) {
    case 'readiness': return (a, b) => b.confidence - a.confidence;
    case 'created': return (a, b) => b.createdAt.localeCompare(a.createdAt);
    case 'name': return (a, b) => a.joinerName.localeCompare(b.joinerName);
    case 'deadline':
    default: return (a, b) => a.readinessDeadline.localeCompare(b.readinessDeadline);
  }
}

export function queryCases(all: Case[], q: CaseQuery): CasePage {
  const terms = (q.search ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filter = q.filter ?? 'all';
  const pageSize = q.pageSize ?? 25;
  const matchedRows = all
    .filter((c) => matchesFilter(c.record, filter) && matchesSearch(c, terms))
    .sort(comparator(q.sort ?? 'deadline'));
  const matched = matchedRows.length;
  const pageCount = Math.max(1, Math.ceil(matched / pageSize));
  const page = Math.min(Math.max(0, q.page ?? 0), pageCount - 1);
  const rows = matchedRows.slice(page * pageSize, page * pageSize + pageSize);
  return { rows, total: all.length, matched, page, pageSize, pageCount };
}

export function countByFilter(all: Case[]): Record<CaseFilterId, number> {
  return {
    all: all.length,
    'at-risk': all.filter((c) => matchesFilter(c.record, 'at-risk')).length,
    blocked: all.filter((c) => matchesFilter(c.record, 'blocked')).length,
    ready: all.filter((c) => matchesFilter(c.record, 'ready')).length,
    completed: all.filter((c) => matchesFilter(c.record, 'completed')).length,
  };
}
