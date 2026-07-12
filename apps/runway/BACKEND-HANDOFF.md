# Runway — Backend Handoff

**For:** the backend engineer/agent building persistence + the agent runtime · **From:** the front-of-house build
**Date:** 2026‑07 · **Product vision (the "why"):** `examples/angular/src/app/ppso/PRODUCT-VISION.md` (read §9 agent boundary, §10 owned‑vs‑referenced, §11 governance — they are binding) · **This app:** `apps/runway`

> **How to use this doc.** The front‑of‑house (Angular app "Runway") is real and runs on a **mock runtime** (in‑memory signals + `localStorage`). Your job is to replace that mock with a real, **governed** backend behind the *same contracts*, then add the **agent runtime + integrations**. The contracts in §4 are the seam — implement them and the UI keeps working. Do **not** change the transformation posture in §8; it's the point of the product.

---

## 1. What Runway is (in one paragraph)

An onboarding‑readiness orchestration platform for Accenture Mauritius PPSO, serving two pathways (**project‑level**, **centre‑level**) as versioned processes. Humans **Compose** the process visually (no‑code) and **Operate** it: each onboarding is a **Case** (a canonical *readiness record*); an agent does the work; humans supervise via an **Action Inbox** and a **live readiness view / process map**. The product owns the *readiness/orchestration layer* + an **immutable event log**; it **references** (never copies) authoritative systems (HR/IAM/assets/tickets/Teams/Outlook/CDP/MyTE). Work enters **only** through structured intake — the agent never guesses intent from free‑form text.

---

## 2. What's already built (front‑of‑house, no backend)

Angular 22, standalone, zoneless. Runs via the `runway` launch config (port 4300) or `pnpm --filter runway start`.

- **Two modes + supervision:**
  - **Compose** (`src/app/compose/`) — the visual Process Studio (nodeweave canvas + catalog‑driven palette + schema inspector). Author a process for a pathway; **Publish** a versioned `ProcessDefinition`.
  - **Operate** (`src/app/operate/`) — **Inbox** (Action Inbox) + **Cases** master‑detail: the readiness view (state, confidence, owners, blockers, items) + the **activity timeline** + a read‑only **process map** (the published graph lit by the case's state).
- **Domain + event model** (`src/app/domain/model.ts`) — the canonical readiness record, state machine, events, actions. **This is the contract.**
- **Governance as code** (`src/app/domain/data-dictionary.ts`) — per‑field classification + owned/referenced + PII masking (gated by a "Reveal PII" control).
- **Mock runtime** (`src/app/runtime/`) — `RuntimeService` (cases/events/actions as signals, seeded, auto‑saved to `localStorage`), `ProcessStore` (published process versions), `persist.ts` (`localStorage` load/save).

**What works today:** publish a process in Compose → Operate runs cases against it (map lit by state); resolve/handle items in the Inbox → the case advances + the event log grows; everything persists across a reload. It's a believable product with **zero backend** — your job is to make it real.

---

## 3. The architecture seam

```
  Angular UI (built)                         Backend (to build)
  ── renders processes/cases/events    ⇄     ── owns the datastore + event log
  ── Compose authors + publishes             ── runs the deterministic engine
  ── Operate supervises (Inbox/map)          ── calls integrations (Graph/mail/…)
                                             ── LLM only at the edges
        the stable contract between them =  the ProcessDefinition (compiled spec) + the Event log
```

The UI never needs to know the runtime's internals; the runtime never needs the UI's. They meet at: **ProcessDefinition**, **ReadinessRecord**, **DomainEvent**, **ActionItem**.

---

## 4. The contracts to implement (canonical: `src/app/domain/model.ts`)

Condensed — treat the TypeScript file as source of truth.

```ts
type Pathway = 'project-level' | 'centre-level';
type RequestType = 'new' | 'update' | 'cancellation' | 'exception';

// Readiness state machine
type ReadinessState =
  | 'draft' | 'waiting-for-info' | 'ready-for-orchestration' | 'in-progress'
  | 'blocked' | 'ready-for-day-1' | 'completed' | 'cancelled' | 'exception';

type ReadinessCategory = 'equipment'|'access'|'workspace'|'orientation'|'stakeholder'|'tooling'|'other';
type ReadinessItemState = 'pending'|'in-progress'|'awaiting-human'|'blocked'|'done'|'skipped';
type Fulfilment = 'auto' | 'agent-assisted' | 'human';   // the agent boundary, per item

interface TaskRef { system: string; id: string; url?: string; }   // a REFERENCE, not a copy
type BlockerKind = 'missing-info'|'conflicting-info'|'failed-integration'|'overdue-task'|'cancelled-request'|'manual-review';
interface Blocker { kind: BlockerKind; detail: string; since: string; }

interface ReadinessItem {
  id: string; category: ReadinessCategory; label: string;
  state: ReadinessItemState; fulfilment: Fulfilment;
  owner?: string; due?: string; taskRef?: TaskRef; blocker?: Blocker;
}
interface Owners { current?: string; nextAction?: string; escalation?: string; }

interface ReadinessRecord {                    // one per onboarding case (dedup!)
  caseRef: string; requestType: RequestType; pathway: Pathway; processVersion: string;
  joinerRef: string; joinerName: string; role: string; location: string;
  intakeSource: string; schemaVersion: string;
  startDate: string; readinessDeadline: string;
  state: ReadinessState; items: ReadinessItem[]; blockers: Blocker[]; owners: Owners;
  createdAt: string; updatedAt: string;
}
// confidence is DERIVED (done / non-skipped items) — never stored.

// The single stream behind live state, audit, and reporting
type EventType =
  | 'case.created' | 'intake.rejected' | 'validation.passed' | 'validation.failed'
  | 'item.started' | 'item.prepared' | 'item.completed' | 'item.blocked'
  | 'reminder.sent' | 'escalation.raised' | 'exception.raised'
  | 'action.approved' | 'action.rejected' | 'state.changed' | 'case.completed' | 'case.cancelled';
type Actor = 'agent' | 'human' | 'system';
interface DomainEvent { id: string; caseRef: string; type: EventType; at: string; actor: Actor; summary: string; itemId?: string; detail?: Record<string, unknown>; }

// Exceptions / human decisions → the Action Inbox
type ActionKind = 'approval' | 'decision' | 'human-task' | 'triage';
interface ActionItem { id: string; caseRef: string; kind: ActionKind; title: string; reason: string; impactedItems: string[]; recommendation?: string; evidence?: string; createdAt: string; status: 'open'|'resolved'|'dismissed'; }

// A published process version (src/app/runtime/process-store.ts)
interface ProcessDefinition { pathway: Pathway; version: number; graph: unknown /* nodeweave CanvasState JSON */; publishedAt: string; }
```

Notes:
- **Live case state and the audit trail are projections of the same event stream.** Do not maintain a separate mutable status that can drift — derive from events (or keep a materialized view that is always rebuilt from events).
- `ProcessDefinition.graph` is the nodeweave graph JSON (`CanvasState.toJSON()`): `{ nodes:[{id,type,x,y,width,height,metadata:{config},ports:[{id,direction,label?}]}], edges:[{id,sourcePortId,targetPortId,type,markerEnd,label?,data?}], viewport }`. The **compiled/executable spec** the engine runs is defined in **`apps/runway/docs/WORKFLOW-SPEC.md`** + **`apps/runway/docs/workflow-spec.schema.json`** (the formal target of the compiler: triggers, steps, `on:` branches, waits, SLAs, closure, monitoring, bindings + execution semantics). Port the working compiler in `examples/angular/src/app/ppso/workflow-compiler.ts` (graph→spec) server‑side to emit that shape.

---

## 5. What the backend must provide

### 5.1 Persistence & the API surface (replace `localStorage`)
A governed datastore for **process versions, cases, events, actions**, plus a read/write API the UI calls. Today the UI uses `RuntimeService`/`ProcessStore` methods directly against in‑memory signals; swap those method bodies for API calls (the method signatures are your API spec — see §7).
- Event store is **append‑only, immutable**. Cases are projections.
- One canonical record per case (**dedup**, BR‑02) even across multiple intake messages/updates.

### 5.2 Structured intake (the ONLY entry point)
- Accept work **only** from approved structured sources (forms/APIs/controlled feeds) with an explicit `requestType` and a `schemaVersion`.
- Validate against the schema; on failure **reject/quarantine/route to human triage** — emit `intake.rejected` and, where relevant, create a `triage` `ActionItem`. **Never infer whether free‑form text is onboarding‑related.**
- Completeness/quality gate (BR‑03): block downstream orchestration when required fields are missing/conflicting; set `waiting-for-info` / `exception` with a clear reason.

### 5.3 The orchestration engine (deterministic)
- Execute a **published `ProcessVersion`** for a case: sequencing, **branches** (gate `valid/missing/invalid`), **waits** (suspend/resume on data arrival), fan‑out to readiness items, SLA timers, escalation policy, and **outcome‑based closure** (`ready-for-day-1`/`completed` only when readiness outcomes are confirmed — not when a ticket is created).
- Every step emits a `DomainEvent`. This engine is **not** an LLM; it must be predictable, explainable, replayable.
- Cases pin the `processVersion` they started on (don't disturb in‑flight cases when a new version publishes).

### 5.4 Integrations (reference, don't duplicate)
Adapter per system; each integration declares an explicit data‑movement contract (what moves, why, retention, deletion). Graceful degradation: if a system is down, preserve case state and surface it.
- **Graph API:** Teams membership, M365/Viva Engage groups, mailing lists (where Graph‑accessible), Outlook mail, Planner (if retained), SharePoint resource‑list writes (as an *output*).
- **Human‑assisted (API‑less):** CDP RORO, MyTE WBS, org chart — the agent **prepares** (pre‑filled block + link) and a human executes; record the outcome. Model as `fulfilment: 'agent-assisted' | 'human'` items → `human-task` actions in the Inbox.
- **Known blocker (from the BRD):** IT must confirm which mailing lists / Engage groups are Graph‑accessible vs WebAdmin‑only. Until confirmed, degrade those to prepared human actions.

### 5.5 The LLM — at the edges only
Permitted: parse an **explicitly submitted** structured request into fields; draft comms in the project's template voice; summarize readiness/blockers **traceable to evidence**; suggest an exception resolution (as a proposed action); answer "what's at risk?" from the event log; assist authoring in Compose.
**Forbidden:** performing any irreversible/external action without a deterministic rule *or* human approval; deciding policy (SLAs, escalation, owner rules, which items); accepting/guessing intent from unstructured comms.

### 5.6 Governance & security (non‑negotiable — PRODUCT-VISION §11 + `data-dictionary.ts`)
Classify before processing · minimum‑necessary data (reference don't duplicate) · protect PII by default (access control, masking, encryption, retention, disposal) · keep authoritative systems authoritative · least privilege + need‑to‑know for users/services/connectors/agent tools · environment separation (synthetic data outside prod) · explicit data‑movement contracts · permission‑aware retrieval if you add search/embeddings (preserve sensitivity metadata) · **log decisions & actions** (classification, extracted fields, validation, transitions, tool calls, task creation, escalations, overrides, closures) without leaking PII into logs · control autonomous actions · validate outputs before reliance · monitoring (schema failures, rejects, failed integrations, exception/duplicate rates, access anomalies, stale tasks, unresolved blockers) · every case has business/technical/exception owners + audit.

---

## 6. The mock seams to replace (where to plug in)

| Front‑end today | Replace with |
|---|---|
| `runtime/persist.ts` (`localStorage`) | governed datastore + event store behind an API |
| `RuntimeService` seed + in‑memory signals | API‑backed reads (cases/events/actions) + subscriptions/polling; mutations become API calls that emit events |
| `RuntimeService.resolveAction/dismissAction` | server‑side action resolution → engine advances the case → events |
| `ProcessStore.publish/published` | server‑side process‑version store (publish returns the version; read is the published def) |
| Seed cases in `RuntimeService` (`seedCases/seedEvents/seedActions`) | real **structured intake** creating cases + the engine producing events |
| `confidenceOf()` (client) | keep client‑side (pure) or mirror server‑side for reporting |
| `operate/process-graph.ts` `buildFromPublished` | **keep** — it already renders any published graph lit by state; feed it the server's published `ProcessDefinition.graph` |

The UI's rendering of the published graph is done and generic — you only need to serve the definition + the case/event data.

---

## 7. Proposed API surface (derived from the current mock methods)

Design REST/RPC as you prefer; these are the operations the UI needs:

- **Intake:** `POST /intake` (structured payload + requestType + schemaVersion) → validates, dedups to a case, emits events, or `intake.rejected` + triage action.
- **Cases:** `GET /cases`, `GET /cases/{caseRef}`, `GET /cases/{caseRef}/events`.
- **Actions (Inbox):** `GET /actions?status=open`, `POST /actions/{id}/resolve`, `POST /actions/{id}/dismiss` (each emits events + may advance the case).
- **Processes:** `GET /processes/{pathway}` (published), `POST /processes/{pathway}/publish` (body: graph JSON) → new version.
- **Reporting:** `GET /reports/...` (cycle time, readiness completion rate, exception volume, blocker categories, cases at risk, duplicate rate, rejected‑input rate) — all queryable from the event log.
- **Auth/RBAC:** who may publish a version; who supervises which cases/pathways; PII‑reveal is an authorization decision (the UI's `piiAuthorized` becomes a real permission).

---

## 8. Non‑negotiables (guardrail checklist)

- [ ] Work enters **only** via structured intake; unstructured/ambiguous → reject/triage. No intent‑guessing.
- [ ] One canonical readiness record per case (dedup).
- [ ] Deterministic engine runs the regulated core; LLM only at the edges (§5.5).
- [ ] Authoritative systems stay authoritative; store **references + state + outcomes**, minimize data movement.
- [ ] Event log is append‑only; live state + audit + reporting are projections of it.
- [ ] Outcome‑based closure (not "ticket created").
- [ ] Everything the agent does is legible, reversible, audited; sensitive/ambiguous/policy actions require a human.
- [ ] Classification + least privilege + env separation + PII protection + permission‑aware retrieval enforced by design.

---

## 9. Open decisions for the backend

- Runtime hosting: bespoke service vs Power Platform vs Copilot Studio vs hybrid — chosen against Graph‑permission, security, operability, cost.
- Datastore + event store technology; retention/residency per Accenture policy (the event log holds PII: EID, dates, names).
- Identity/SSO + RBAC model; least‑privilege service accounts for connectors.
- Confirm keep/reference per system (esp. who consumes SharePoint resource lists; whether Planner is relied on beyond onboarding).
- Intake contract(s) per pathway (fields + schema versioning).

---

## 10. Repo map (read these first)

- `examples/angular/src/app/ppso/PRODUCT-VISION.md` — the vision (v2), incl. governance (§11) and the BR‑01…08 traceability (§19). **Start here.**
- `apps/runway/docs/WORKFLOW-SPEC.md` + `apps/runway/docs/workflow-spec.schema.json` — the compiled workflow spec the engine runs (contract + JSON Schema + execution semantics + worked example).
- `apps/runway/src/app/domain/model.ts` — the contract (types above).
- `apps/runway/src/app/domain/data-dictionary.ts` — classification + owned/referenced.
- `apps/runway/src/app/runtime/{runtime.service.ts,process-store.ts,persist.ts}` — the mock to replace; method signatures = your API spec.
- `apps/runway/src/app/operate/process-graph.ts` — how a published graph is rendered + lit (keep as‑is; feed it server data).
- `examples/angular/src/app/ppso/workflow-compiler.ts` — a working graph→YAML/spec compiler to port server‑side for the engine.
- `examples/angular/src/app/ppso/simulator.ts` — a reference for how execution animates (design‑time dry‑run; the real engine mirrors its branch/wait semantics).

---

## 11. Acceptance

Map your implementation to the Centre‑Level BRD **BR‑01…08** and acceptance criteria (traceability table in PRODUCT-VISION §19), and to the success metrics in §18: manual minutes ≈ 0 for automated steps, shorter/consistent time‑to‑ready, rising % fully automated, config/process changes with **zero developer tickets**, falling overdue/escalation rate, and the litmus test — *nobody opens a SharePoint list to find out what's happening.*
