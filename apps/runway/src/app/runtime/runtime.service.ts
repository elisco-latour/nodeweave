import { Injectable, computed, effect, signal } from '@angular/core';
import {
  type ReadinessRecord, type DomainEvent, type ActionItem, type ReadinessItem,
  type ReadinessState, type Pathway, type RequestType, confidenceOf,
} from '../domain/model';
import { loadJson, saveJson } from './persist';

/** The structured-intake payload the New-case form submits (the mock's POST /intake body). */
export interface NewCaseInput {
  pathway: Pathway;
  requestType: RequestType;
  processVersion: string;
  joinerName: string;
  joinerRef: string; // EID
  role: string;
  location: string;
  startDate: string;
  readinessDeadline: string;
  intakeSource: string;
  schemaVersion: string;
}

/**
 * Mock runtime. Stands in for the eventual governed backend (datastore + event
 * log + agent) so the Operate UX is real and demoable with no plumbing. State
 * is signal-based; every mutation appends to the event log — the same contract
 * the real runtime will honour.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeService {
  readonly #cases = signal<ReadinessRecord[]>(loadJson('cases', seedCases()));
  readonly #events = signal<DomainEvent[]>(loadJson('events', seedEvents()));
  readonly #actions = signal<ActionItem[]>(loadJson('actions', seedActions()));

  /** Governance: PII is masked until an authorized viewer reveals it (not persisted). */
  readonly piiAuthorized = signal(false);

  readonly cases = this.#cases.asReadonly();
  readonly actions = this.#actions.asReadonly();
  readonly openActions = computed(() => this.#actions().filter((a) => a.status === 'open'));

  constructor() {
    // Persist on any change — the event log + cases survive a refresh.
    effect(() => {
      saveJson('cases', this.#cases());
      saveJson('events', this.#events());
      saveJson('actions', this.#actions());
    });
  }

  caseByRef(ref: string): ReadinessRecord | undefined {
    return this.#cases().find((c) => c.caseRef === ref);
  }

  eventsFor(ref: string): DomainEvent[] {
    return this.#events()
      .filter((e) => e.caseRef === ref)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  confidence(rec: ReadinessRecord): number {
    return confidenceOf(rec);
  }

  togglePii(): void {
    this.piiAuthorized.update((v) => !v);
  }

  /** Approve/handle an action: log it, complete any human-task items, re-derive state. */
  resolveAction(id: string): void {
    const action = this.#actions().find((a) => a.id === id);
    if (!action) return;
    this.#actions.update((list) => list.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)));
    this.#append(action.caseRef, 'action.approved', 'human', `Resolved: ${action.title}`);

    if (action.kind === 'human-task') {
      this.#patchCase(action.caseRef, (rec) => {
        const items = rec.items.map((i) =>
          action.impactedItems.includes(i.id) ? { ...i, state: 'done' as const, blocker: undefined } : i,
        );
        for (const i of items) {
          if (action.impactedItems.includes(i.id)) {
            this.#append(rec.caseRef, 'item.completed', 'human', `${i.label} — completed`, i.id);
          }
        }
        return this.#rederive({ ...rec, items });
      });
    }
  }

  dismissAction(id: string): void {
    const action = this.#actions().find((a) => a.id === id);
    if (!action) return;
    this.#actions.update((list) => list.map((a) => (a.id === id ? { ...a, status: 'dismissed' } : a)));
    this.#append(action.caseRef, 'exception.raised', 'human', `Dismissed: ${action.title}`);
  }

  /** Re-read state from the store — stands in for a backend refetch. */
  reload(): void {
    this.#cases.set(loadJson('cases', this.#cases()));
    this.#events.set(loadJson('events', this.#events()));
    this.#actions.set(loadJson('actions', this.#actions()));
  }

  /** An active (non-closed) case for this EID, if any — dedup awareness (BR-02). */
  openCaseForJoiner(joinerRef: string): ReadinessRecord | undefined {
    const ref = joinerRef.trim().toLowerCase();
    if (!ref) return undefined;
    return this.#cases().find(
      (c) => c.joinerRef.trim().toLowerCase() === ref && c.state !== 'completed' && c.state !== 'cancelled',
    );
  }

  /**
   * Create a case from a validated structured intake. Stands in for the backend
   * POST /intake: builds the canonical record, fans out readiness items for the
   * pathway, and emits case.created + validation.passed. Returns the new caseRef.
   */
  createCase(input: NewCaseInput): string {
    const caseRef = this.#nextCaseRef();
    const now = new Date().toISOString();
    const rec: ReadinessRecord = {
      caseRef,
      requestType: input.requestType,
      pathway: input.pathway,
      processVersion: input.processVersion,
      joinerRef: input.joinerRef.trim(),
      joinerName: input.joinerName.trim(),
      role: input.role.trim(),
      location: input.location.trim(),
      intakeSource: input.intakeSource,
      schemaVersion: input.schemaVersion,
      startDate: input.startDate,
      readinessDeadline: input.readinessDeadline,
      state: 'ready-for-orchestration',
      items: defaultItems(input.pathway),
      blockers: [],
      owners: { current: 'PPSO Operations', nextAction: 'Agent', escalation: 'PPSO Head' },
      createdAt: now,
      updatedAt: now,
    };
    this.#cases.update((list) => [rec, ...list]);
    this.#append(caseRef, 'case.created', 'system', `Case created from ${input.intakeSource}`);
    this.#append(caseRef, 'validation.passed', 'agent', 'Mandatory fields valid — ready for orchestration');
    return caseRef;
  }

  #nextCaseRef(): string {
    const nums = this.#cases()
      .map((c) => parseInt(c.caseRef.replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 1000) + 1;
    return `RW-${next}`;
  }

  // ── internals ──────────────────────────────────────────────────────────────
  #patchCase(ref: string, fn: (rec: ReadinessRecord) => ReadinessRecord): void {
    this.#cases.update((list) => list.map((c) => (c.caseRef === ref ? fn(c) : c)));
  }

  #rederive(rec: ReadinessRecord): ReadinessRecord {
    const active = rec.items.filter((i) => i.state !== 'skipped');
    let state: ReadinessState = rec.state;
    if (active.some((i) => i.state === 'blocked')) state = 'blocked';
    else if (active.every((i) => i.state === 'done')) state = 'ready-for-day-1';
    else if (active.some((i) => i.state !== 'pending')) state = 'in-progress';
    if (state !== rec.state) {
      this.#append(rec.caseRef, 'state.changed', 'agent', `State → ${state}`);
    }
    return { ...rec, state, updatedAt: new Date().toISOString() };
  }

  #append(caseRef: string, type: DomainEvent['type'], actor: DomainEvent['actor'], summary: string, itemId?: string): void {
    this.#events.update((list) => [
      ...list,
      { id: `ev-${list.length + 1}-${Date.now()}`, caseRef, type, actor, summary, itemId, at: new Date().toISOString() },
    ]);
  }
}

// ── Seed data (representative of both onboarding tracks) ─────────────────────
function item(
  id: string, category: ReadinessItem['category'], label: string,
  state: ReadinessItem['state'], fulfilment: ReadinessItem['fulfilment'],
  extra: Partial<ReadinessItem> = {},
): ReadinessItem {
  return { id, category, label, state, fulfilment, ...extra };
}

/** The readiness items a fresh case starts with, per pathway (ids match the process map). */
function defaultItems(pathway: Pathway): ReadinessItem[] {
  if (pathway === 'centre-level') {
    return [
      item('laptop', 'equipment', 'Laptop provisioned', 'pending', 'auto', { owner: 'IT Assets' }),
      item('m365', 'access', 'M365 account & licences', 'pending', 'auto', { owner: 'IAM' }),
      item('desk', 'workspace', 'Workspace / desk assignment', 'pending', 'human', { owner: 'Facilities' }),
      item('orientation', 'orientation', 'Orientation session booked', 'pending', 'agent-assisted', { owner: 'PPSO' }),
      item('buddy', 'stakeholder', 'Buddy assigned', 'pending', 'auto', { owner: 'PPSO' }),
    ];
  }
  return [
    item('access', 'access', 'Directory & mailing lists', 'pending', 'auto', { owner: 'IAM' }),
    item('cdp', 'tooling', 'CDP RORO', 'pending', 'agent-assisted', { owner: 'CDP Owner' }),
    item('teams', 'access', 'Teams channel membership', 'pending', 'auto', { owner: 'Project Lead' }),
    item('myte', 'access', 'MyTE WBS access', 'pending', 'agent-assisted', { owner: 'MyTE Admin' }),
  ];
}

function seedCases(): ReadinessRecord[] {
  return [
    {
      caseRef: 'RW-1042', requestType: 'new', pathway: 'centre-level', processVersion: 'centre-onboarding@3',
      joinerRef: 'J-88431', joinerName: 'Aïsha Bello', role: 'Analyst', location: 'Ebène, MU',
      intakeSource: 'Intake form', schemaVersion: 'v2', startDate: '2026-07-20', readinessDeadline: '2026-07-18',
      state: 'in-progress',
      items: [
        item('laptop', 'equipment', 'Laptop provisioned', 'done', 'auto', { owner: 'IT Assets', taskRef: { system: 'AssetHub', id: 'AS-3321' } }),
        item('m365', 'access', 'M365 account & licences', 'done', 'auto', { owner: 'IAM', taskRef: { system: 'IAM', id: 'IAM-9087' } }),
        item('desk', 'workspace', 'Workspace / desk assignment', 'awaiting-human', 'human', { owner: 'Facilities', due: '2026-07-17' }),
        item('orientation', 'orientation', 'Orientation session booked', 'pending', 'agent-assisted', { owner: 'PPSO', due: '2026-07-19' }),
        item('buddy', 'stakeholder', 'Buddy assigned', 'done', 'auto', { owner: 'PPSO' }),
      ],
      blockers: [], owners: { current: 'N. Rughoo (Ops)', nextAction: 'Facilities', escalation: 'PPSO Head' },
      createdAt: '2026-07-09T08:12:00Z', updatedAt: '2026-07-11T06:40:00Z',
    },
    {
      caseRef: 'RW-1043', requestType: 'new', pathway: 'project-level', processVersion: 'project-onboarding@5',
      joinerRef: 'J-88440', joinerName: 'Marc Olsen', role: 'Consultant', location: 'Ebène, MU',
      intakeSource: 'Project intake API', schemaVersion: 'v2', startDate: '2026-07-15', readinessDeadline: '2026-07-14',
      state: 'blocked',
      items: [
        item('access', 'access', 'Directory & mailing lists', 'blocked', 'auto', { owner: 'IAM', blocker: { kind: 'missing-info', detail: 'Requires a valid EID', since: '2026-07-10T09:00:00Z' } }),
        item('cdp', 'tooling', 'CDP RORO', 'pending', 'agent-assisted', { owner: 'CDP Owner' }),
        item('teams', 'access', 'Teams channel membership', 'pending', 'auto', { owner: 'Project Lead' }),
        item('myte', 'access', 'MyTE WBS access', 'pending', 'agent-assisted', { owner: 'MyTE Admin' }),
      ],
      blockers: [{ kind: 'missing-info', detail: 'EID missing — gate not passed', since: '2026-07-10T09:00:00Z' }],
      owners: { current: 'Project PMO (VINCI)', nextAction: 'Project Lead', escalation: 'PPSO Head' },
      createdAt: '2026-07-10T08:55:00Z', updatedAt: '2026-07-10T09:00:00Z',
    },
    {
      caseRef: 'RW-1044', requestType: 'new', pathway: 'centre-level', processVersion: 'centre-onboarding@3',
      joinerRef: 'J-88452', joinerName: 'Wei Chen', role: 'Manager', location: 'Ebène, MU',
      intakeSource: 'Intake form', schemaVersion: 'v2', startDate: '2026-07-28', readinessDeadline: '2026-07-25',
      state: 'waiting-for-info',
      items: [
        item('laptop', 'equipment', 'Laptop provisioned', 'pending', 'auto'),
        item('m365', 'access', 'M365 account & licences', 'pending', 'auto'),
        item('orientation', 'orientation', 'Orientation session booked', 'pending', 'agent-assisted'),
      ],
      blockers: [{ kind: 'conflicting-info', detail: 'Start date conflict (intake vs HR feed)', since: '2026-07-11T05:10:00Z' }],
      owners: { current: 'N. Rughoo (Ops)', nextAction: 'Requester', escalation: 'PPSO Head' },
      createdAt: '2026-07-11T05:05:00Z', updatedAt: '2026-07-11T05:10:00Z',
    },
    {
      caseRef: 'RW-1050', requestType: 'new', pathway: 'project-level', processVersion: 'project-onboarding@5',
      joinerRef: 'J-88399', joinerName: 'Priya Nair', role: 'Senior Analyst', location: 'Ebène, MU',
      intakeSource: 'Project intake API', schemaVersion: 'v2', startDate: '2026-07-14', readinessDeadline: '2026-07-11',
      state: 'ready-for-day-1',
      items: [
        item('access', 'access', 'Directory & mailing lists', 'done', 'auto', { owner: 'IAM' }),
        item('cdp', 'tooling', 'CDP RORO', 'done', 'agent-assisted', { owner: 'CDP Owner' }),
        item('teams', 'access', 'Teams channel membership', 'done', 'auto', { owner: 'Project Lead' }),
        item('myte', 'access', 'MyTE WBS access', 'done', 'agent-assisted', { owner: 'MyTE Admin' }),
      ],
      blockers: [], owners: { current: 'Project PMO (ATLAS)', nextAction: '—', escalation: 'PPSO Head' },
      createdAt: '2026-07-06T10:00:00Z', updatedAt: '2026-07-11T04:00:00Z',
    },
    {
      caseRef: 'RW-1039', requestType: 'new', pathway: 'centre-level', processVersion: 'centre-onboarding@3',
      joinerRef: 'J-88301', joinerName: 'Tom Reeves', role: 'Analyst', location: 'Ebène, MU',
      intakeSource: 'Intake form', schemaVersion: 'v2', startDate: '2026-07-07', readinessDeadline: '2026-07-04',
      state: 'completed',
      items: [
        item('laptop', 'equipment', 'Laptop provisioned', 'done', 'auto'),
        item('m365', 'access', 'M365 account & licences', 'done', 'auto'),
        item('desk', 'workspace', 'Workspace / desk assignment', 'done', 'human'),
        item('orientation', 'orientation', 'Orientation session booked', 'done', 'agent-assisted'),
        item('buddy', 'stakeholder', 'Buddy assigned', 'done', 'auto'),
      ],
      blockers: [], owners: { current: 'N. Rughoo (Ops)', nextAction: '—', escalation: 'PPSO Head' },
      createdAt: '2026-06-30T09:00:00Z', updatedAt: '2026-07-07T07:30:00Z',
    },
  ];
}

function seedActions(): ActionItem[] {
  return [
    {
      id: 'ACT-1', caseRef: 'RW-1043', kind: 'triage',
      title: 'Missing EID — Marc Olsen',
      reason: 'EID validation gate did not pass. Directory, CDP RORO, Teams and MyTE all require a valid EID before they can run.',
      impactedItems: ['access', 'cdp', 'teams', 'myte'],
      recommendation: 'Chase the Project Lead for the EID. The case resumes automatically once it is provided.',
      evidence: 'Intake RW-1043 (Project intake API, schema v2) — field employee_id is empty.',
      createdAt: '2026-07-10T09:00:00Z', status: 'open',
    },
    {
      id: 'ACT-2', caseRef: 'RW-1044', kind: 'decision',
      title: 'Conflicting start dates — Wei Chen',
      reason: 'The structured intake and the HR feed disagree on the start date, so orientation and equipment timing cannot be fixed.',
      impactedItems: ['orientation', 'laptop'],
      recommendation: 'Confirm the correct start date with the requester, then the case moves to orchestration.',
      evidence: 'intake.startDate = 2026-07-28 vs hr.startDate = 2026-08-04.',
      createdAt: '2026-07-11T05:10:00Z', status: 'open',
    },
    {
      id: 'ACT-3', caseRef: 'RW-1042', kind: 'human-task',
      title: 'Assign workspace — Aïsha Bello',
      reason: 'Desk assignment has no API; a human completes it. Everything else the agent could do is done.',
      impactedItems: ['desk'],
      recommendation: 'Assign a desk in Zone B and mark complete.',
      evidence: 'Facilities queue — prepared by agent, awaiting assignment.',
      createdAt: '2026-07-11T06:40:00Z', status: 'open',
    },
  ];
}

function seedEvents(): DomainEvent[] {
  return [
    { id: 'ev-1', caseRef: 'RW-1042', type: 'case.created', actor: 'system', summary: 'Case created from structured intake', at: '2026-07-09T08:12:00Z' },
    { id: 'ev-2', caseRef: 'RW-1042', type: 'validation.passed', actor: 'agent', summary: 'Mandatory fields valid', at: '2026-07-09T08:12:30Z' },
    { id: 'ev-3', caseRef: 'RW-1042', type: 'item.completed', actor: 'agent', summary: 'M365 account & licences — completed', itemId: 'm365', at: '2026-07-09T08:20:00Z' },
    { id: 'ev-4', caseRef: 'RW-1042', type: 'item.completed', actor: 'agent', summary: 'Laptop provisioned — completed', itemId: 'laptop', at: '2026-07-10T14:05:00Z' },
    { id: 'ev-5', caseRef: 'RW-1042', type: 'item.completed', actor: 'agent', summary: 'Buddy assigned — completed', itemId: 'buddy', at: '2026-07-10T15:00:00Z' },
    { id: 'ev-6', caseRef: 'RW-1042', type: 'item.prepared', actor: 'agent', summary: 'Workspace assignment prepared for Facilities', itemId: 'desk', at: '2026-07-11T06:40:00Z' },

    { id: 'ev-7', caseRef: 'RW-1043', type: 'case.created', actor: 'system', summary: 'Case created from Project intake API', at: '2026-07-10T08:55:00Z' },
    { id: 'ev-8', caseRef: 'RW-1043', type: 'validation.failed', actor: 'agent', summary: 'EID missing — Pending; no plan created', at: '2026-07-10T09:00:00Z' },
    { id: 'ev-9', caseRef: 'RW-1043', type: 'exception.raised', actor: 'agent', summary: 'Routed to human triage: missing EID', at: '2026-07-10T09:00:05Z' },

    { id: 'ev-10', caseRef: 'RW-1044', type: 'case.created', actor: 'system', summary: 'Case created from structured intake', at: '2026-07-11T05:05:00Z' },
    { id: 'ev-11', caseRef: 'RW-1044', type: 'validation.failed', actor: 'agent', summary: 'Conflicting start dates — waiting for information', at: '2026-07-11T05:10:00Z' },

    { id: 'ev-12', caseRef: 'RW-1050', type: 'case.created', actor: 'system', summary: 'Case created from Project intake API', at: '2026-07-06T10:00:00Z' },
    { id: 'ev-13', caseRef: 'RW-1050', type: 'case.completed', actor: 'agent', summary: 'All readiness outcomes confirmed — Ready for Day 1', at: '2026-07-11T04:00:00Z' },

    { id: 'ev-14', caseRef: 'RW-1039', type: 'case.completed', actor: 'agent', summary: 'Onboarding complete', at: '2026-07-07T07:30:00Z' },
  ];
}
