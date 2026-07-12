import { confidenceOf, type ReadinessRecord, type ReadinessState } from '../domain/model';

/**
 * Case querying — filter, search, sort, and paginate the case set. This is the
 * shape a real backend would expose as GET /cases?filter=&sort=&page= ; the
 * List and Table views both go through it so the API seam is honest and the
 * client never has to render more than a page.
 */
export type FilterId = 'all' | 'at-risk' | 'blocked' | 'ready' | 'completed';
export type SortId = 'deadline' | 'readiness' | 'created' | 'name';

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All cases' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];
export const SORTS: { id: SortId; label: string }[] = [
  { id: 'deadline', label: 'Ready by' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'created', label: 'Newest' },
  { id: 'name', label: 'Name' },
];

export interface CaseQuery {
  search?: string;
  filter?: FilterId;
  sort?: SortId;
  page?: number; // 0-based
  pageSize?: number;
}
export interface CasePage {
  rows: ReadinessRecord[];
  total: number; // all records
  matched: number; // after filter + search
  page: number; // clamped 0-based
  pageSize: number;
  pageCount: number;
}

const AT_RISK_STATES: ReadinessState[] = ['blocked', 'exception', 'waiting-for-info'];
const TODAY = new Date().toISOString().slice(0, 10);

function overdue(c: ReadinessRecord): boolean {
  return c.readinessDeadline < TODAY && c.state !== 'completed' && c.state !== 'ready-for-day-1';
}

export function matchesFilter(c: ReadinessRecord, f: FilterId): boolean {
  switch (f) {
    case 'all': return true;
    case 'at-risk': return AT_RISK_STATES.includes(c.state) || overdue(c);
    case 'blocked': return c.state === 'blocked' || c.state === 'exception';
    case 'ready': return c.state === 'ready-for-day-1';
    case 'completed': return c.state === 'completed';
  }
}

function matchesSearch(c: ReadinessRecord, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = [c.caseRef, c.joinerName, c.role, c.location, c.pathway, c.state].join(' ').toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function comparator(sort: SortId): (a: ReadinessRecord, b: ReadinessRecord) => number {
  switch (sort) {
    case 'readiness': return (a, b) => confidenceOf(b) - confidenceOf(a);
    case 'created': return (a, b) => b.createdAt.localeCompare(a.createdAt);
    case 'name': return (a, b) => a.joinerName.localeCompare(b.joinerName);
    case 'deadline':
    default: return (a, b) => a.readinessDeadline.localeCompare(b.readinessDeadline);
  }
}

export function queryCases(all: ReadinessRecord[], q: CaseQuery): CasePage {
  const terms = (q.search ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filter = q.filter ?? 'all';
  const pageSize = q.pageSize ?? 25;
  const matchedRows = all.filter((c) => matchesFilter(c, filter) && matchesSearch(c, terms)).sort(comparator(q.sort ?? 'deadline'));
  const matched = matchedRows.length;
  const pageCount = Math.max(1, Math.ceil(matched / pageSize));
  const page = Math.min(Math.max(0, q.page ?? 0), pageCount - 1);
  const rows = matchedRows.slice(page * pageSize, page * pageSize + pageSize);
  return { rows, total: all.length, matched, page, pageSize, pageCount };
}

export function countByFilter(all: ReadinessRecord[]): Record<FilterId, number> {
  return {
    all: all.length,
    'at-risk': all.filter((c) => matchesFilter(c, 'at-risk')).length,
    blocked: all.filter((c) => matchesFilter(c, 'blocked')).length,
    ready: all.filter((c) => matchesFilter(c, 'ready')).length,
    completed: all.filter((c) => matchesFilter(c, 'completed')).length,
  };
}
