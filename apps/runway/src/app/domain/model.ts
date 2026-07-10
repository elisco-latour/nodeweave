/**
 * Runway domain model — the canonical onboarding *readiness* record and the
 * events around it. Deliberately small: it holds only the operational fields
 * needed to assess readiness, orchestrate actions, manage exceptions, and
 * report — and *references* authoritative systems rather than copying them.
 *
 * See PRODUCT-VISION.md (§6 domain, §10 owned-vs-referenced, §11 governance)
 * and data-dictionary.ts for the per-field classification.
 */

// ── Onboarding pathways (each is a versioned process) ────────────────────────
export type Pathway = 'project-level' | 'centre-level';

/** Explicit request type — always chosen, never inferred from free-form text. */
export type RequestType = 'new' | 'update' | 'cancellation' | 'exception';

// ── Readiness state machine (BRD §7) ─────────────────────────────────────────
export type ReadinessState =
  | 'draft'
  | 'waiting-for-info'
  | 'ready-for-orchestration'
  | 'in-progress'
  | 'blocked'
  | 'ready-for-day-1'
  | 'completed'
  | 'cancelled'
  | 'exception';

export const READINESS_STATE_LABEL: Record<ReadinessState, string> = {
  draft: 'Draft',
  'waiting-for-info': 'Waiting for information',
  'ready-for-orchestration': 'Ready for orchestration',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  'ready-for-day-1': 'Ready for Day 1',
  completed: 'Completed',
  cancelled: 'Cancelled',
  exception: 'Exception',
};

// ── Readiness items (the work) ───────────────────────────────────────────────
export type ReadinessCategory =
  | 'equipment' | 'access' | 'workspace' | 'orientation' | 'stakeholder' | 'tooling' | 'other';

export type ReadinessItemState =
  | 'pending' | 'in-progress' | 'awaiting-human' | 'blocked' | 'done' | 'skipped';

/** How an item is fulfilled — the agent boundary, per item. */
export type Fulfilment = 'auto' | 'agent-assisted' | 'human';

/** A reference into an authoritative system — never a copy of its data. */
export interface TaskRef {
  system: string;   // e.g. 'Teams', 'CDP', 'MyTE', 'IAM'
  id: string;
  url?: string;
}

export type BlockerKind =
  | 'missing-info' | 'conflicting-info' | 'failed-integration'
  | 'overdue-task' | 'cancelled-request' | 'manual-review';

export interface Blocker {
  kind: BlockerKind;
  detail: string;
  since: string; // ISO
}

export interface ReadinessItem {
  id: string;
  category: ReadinessCategory;
  label: string;
  state: ReadinessItemState;
  fulfilment: Fulfilment;
  owner?: string;       // accountable party (a referenced identity)
  due?: string;         // ISO date
  taskRef?: TaskRef;    // reference into a source system
  blocker?: Blocker;
}

// ── Accountability (BRD: every case has clear owners) ────────────────────────
export interface Owners {
  current?: string;
  nextAction?: string;
  escalation?: string;
}

// ── The canonical readiness record (one per case; BR-02) ─────────────────────
export interface ReadinessRecord {
  caseRef: string;
  requestType: RequestType;
  pathway: Pathway;
  processVersion: string;      // which published process/version this case runs
  joinerRef: string;           // non-sensitive linking reference
  joinerName: string;          // personal — masked unless authorized (see dictionary)
  role: string;
  location: string;
  intakeSource: string;        // approved structured channel
  schemaVersion: string;       // the validation contract used
  startDate: string;           // ISO
  readinessDeadline: string;   // ISO
  state: ReadinessState;
  items: ReadinessItem[];
  blockers: Blocker[];
  owners: Owners;
  createdAt: string;
  updatedAt: string;
}

/** Completion confidence — derived, not stored (done / total non-skipped). */
export function confidenceOf(rec: ReadinessRecord): number {
  const counted = rec.items.filter((i) => i.state !== 'skipped');
  if (counted.length === 0) return 0;
  const done = counted.filter((i) => i.state === 'done').length;
  return done / counted.length;
}

// ── Events — the single stream behind live state, audit, and reporting ───────
export type EventType =
  | 'case.created' | 'intake.rejected'
  | 'validation.passed' | 'validation.failed'
  | 'item.started' | 'item.prepared' | 'item.completed' | 'item.blocked'
  | 'reminder.sent' | 'escalation.raised' | 'exception.raised'
  | 'action.approved' | 'action.rejected'
  | 'state.changed' | 'case.completed' | 'case.cancelled';

export type Actor = 'agent' | 'human' | 'system';

export interface DomainEvent {
  id: string;
  caseRef: string;
  type: EventType;
  at: string;                       // ISO timestamp
  actor: Actor;
  summary: string;                  // human-readable, traceable to evidence
  itemId?: string;
  detail?: Record<string, unknown>;
}

// ── Exceptions / human decisions (populate the Action Inbox; BR-05) ──────────
export type ActionKind = 'approval' | 'decision' | 'human-task' | 'triage';

export interface ActionItem {
  id: string;
  caseRef: string;
  kind: ActionKind;
  title: string;
  reason: string;              // why it needs a human
  impactedItems: string[];     // readiness item ids
  recommendation?: string;     // recommended next action
  evidence?: string;           // traceable evidence
  createdAt: string;
  status: 'open' | 'resolved' | 'dismissed';
}
