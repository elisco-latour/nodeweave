# Runway — Backend Handoff

**For:** the backend engineer/agent building persistence + the agent runtime · **From:** the front-of-house build
**Date:** 2026‑07 (rev. 2 — after the Clean‑Architecture + auth pass) · **Product vision (the "why"):** `examples/angular/src/app/ppso/PRODUCT-VISION.md` (read §9 agent boundary, §10 owned‑vs‑referenced, §11 governance — they are binding) · **This app:** `apps/runway`

> **How to use this doc.** The front‑of‑house (Angular app "Runway") is real and runs on a **mock runtime** (in‑memory signals + `localStorage`). Your job is to replace that mock with a real, **governed** backend behind the *same contracts*, then add the **agent runtime + integrations**. The seam is now a set of **feature ports** (TypeScript interfaces + DI tokens) — implement HTTP repositories against them (§5) and the UI keeps working. Do **not** change the transformation posture in §10; it's the point of the product.

---

## 1. What Runway is (in one paragraph)

An onboarding‑readiness orchestration platform for Accenture Mauritius PPSO, serving two pathways (**project‑level**, **centre‑level**) as versioned processes. Humans **Compose** the process visually (no‑code) and **Operate** it: each onboarding is a **Case** (a canonical *readiness record*); an agent does the work; humans supervise via an **Action Inbox** and a **live readiness view / process map**. The product owns the *readiness/orchestration layer* + an **immutable event log**; it **references** (never copies) authoritative systems (HR/IAM/assets/tickets/Teams/Outlook/CDP/MyTE). Work enters **only** through structured intake — the agent never guesses intent from free‑form text.

---

## 2. What's already built (front‑of‑house, no backend)

Angular 22 — standalone, zoneless, signals. Runs via the `runway` launch config (port 4300) or `pnpm --filter runway start`. The app has been migrated to **Feature‑Centric Clean Architecture (MVVM + Railway‑Oriented Programming + TDD)**.

**Layout (`apps/runway/src/app/`):**
- **`features/<slice>/`** — six vertical slices, each layered `domain/` → `application/` → `infrastructure/` → `state/` → `ui/`:
  - `actions` — the **Action Inbox** (master‑detail).
  - `cases` — the **Cases** registry (paginated table) + case detail (readiness view, activity timeline, process map) + the **New‑case intake wizard**.
  - `overview` — the **home dashboard** (a read‑model projection over cases + open actions).
  - `processes` — **Compose** (the visual Process Studio) + the read‑only case **process map**.
  - `notifications` — the activity‑feed bell (a live projection of the event log).
  - `settings` — appearance, governance & data, per‑pathway process config, integrations.
- **`core/`** — cross‑cutting: `base/` (`ViewModelBase`, `UseCase`, `ObservableObject`), `auth/` (session + SSO seam — §6), `governance/` (`GovernanceService` — PII policy), `interceptors/` (`authInterceptor`).
- **`shared/`** — `kernel/` (`Result<T,E>` / `ok` / `fail` / `match` / `NetworkError`, `DomainError`), `ui/` (`rw-error-banner`, `rw-loading`).
- **`runtime/`** — the **mock backend seam**: `RuntimeService` (cases/events/actions as signals, seeded, auto‑saved to `localStorage`), `ProcessStore` (published process versions), `persist.ts`. Feature repositories wrap these today.
- **`domain/`** — shared `model.ts` (**the contract** — §4) + `data-dictionary.ts` (governance/PII classification).

**What works today (zero backend):** sign in (mock SSO) → publish a process in Compose → Operate runs cases against it (map lit by state) → resolve/handle items in the Inbox → the case advances + the event log grows → the notifications feed and dashboard update → everything persists across a reload. Loading/error/retry states are wired throughout, ready for a fallible backend. Your job is to make it real.

---

## 3. The architecture seam

```
  Angular UI (built)                          Backend (to build)
  ── ViewModels → Use cases → Ports     ⇄     ── owns the datastore + event log
  ── Compose authors + publishes              ── runs the deterministic engine
  ── Operate supervises (Inbox/map)           ── calls integrations (Graph/mail/…)
  ── BFF cookie session (no tokens)           ── BFF + IdP (SSO), LLM only at edges
        the stable contract between them = the feature Ports + the shapes in domain/model.ts
```

**The concrete seam is the feature *ports*** — TypeScript interfaces + `InjectionToken`s in `features/*/application/ports/` (and `core/auth`). Each is bound at the composition root (`src/main.ts`) via a `provide<Feature>Feature()` function to a **repository** that today wraps the mock runtime. The UI (ViewModels → Use cases) only ever sees the port. See §5.

---

## 4. The contracts to implement (canonical: `src/app/domain/model.ts`)

The wire shapes (DTOs) are unchanged from rev. 1 — condensed here; **treat the TypeScript file as source of truth.** The frontend wraps these DTOs in rich domain entities via mappers (`Case`←`ReadinessRecord`, `Action`←`ActionItem`, `Notification`←`DomainEvent`, `Process`←`ProcessDefinition`), so the API serves the raw shapes below.

```ts
type Pathway = 'project-level' | 'centre-level';
type RequestType = 'new' | 'update' | 'cancellation' | 'exception';

type ReadinessState =
  | 'draft' | 'waiting-for-info' | 'ready-for-orchestration' | 'in-progress'
  | 'blocked' | 'ready-for-day-1' | 'completed' | 'cancelled' | 'exception';
type ReadinessCategory = 'equipment'|'access'|'workspace'|'orientation'|'stakeholder'|'tooling'|'other';
type ReadinessItemState = 'pending'|'in-progress'|'awaiting-human'|'blocked'|'done'|'skipped';
type Fulfilment = 'auto' | 'agent-assisted' | 'human';   // the agent boundary, per item

interface TaskRef { system: string; id: string; url?: string; }   // a REFERENCE, not a copy
type BlockerKind = 'missing-info'|'conflicting-info'|'failed-integration'|'overdue-task'|'cancelled-request'|'manual-review';
interface Blocker { kind: BlockerKind; detail: string; since: string; }
interface ReadinessItem { id: string; category: ReadinessCategory; label: string; state: ReadinessItemState; fulfilment: Fulfilment; owner?: string; due?: string; taskRef?: TaskRef; blocker?: Blocker; }
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

type EventType =
  | 'case.created' | 'intake.rejected' | 'validation.passed' | 'validation.failed'
  | 'item.started' | 'item.prepared' | 'item.completed' | 'item.blocked'
  | 'reminder.sent' | 'escalation.raised' | 'exception.raised'
  | 'action.approved' | 'action.rejected' | 'state.changed' | 'case.completed' | 'case.cancelled';
type Actor = 'agent' | 'human' | 'system';
interface DomainEvent { id: string; caseRef: string; type: EventType; at: string; actor: Actor; summary: string; itemId?: string; detail?: Record<string, unknown>; }

type ActionKind = 'approval' | 'decision' | 'human-task' | 'triage';
interface ActionItem { id: string; caseRef: string; kind: ActionKind; title: string; reason: string; impactedItems: string[]; recommendation?: string; evidence?: string; createdAt: string; status: 'open'|'resolved'|'dismissed'; }

interface ProcessDefinition { pathway: Pathway; version: number; graph: unknown /* nodeweave CanvasState JSON */; publishedAt: string; }

// NEW — the authenticated user returned by the BFF (§6). The SPA never sees tokens.
interface User { id: string; name: string; email: string; org: string; roles: string[]; }
```

Notes:
- **Live case state and the audit trail are projections of the same event stream.** Do not maintain a separate mutable status that can drift — derive from events (or keep a materialized view always rebuilt from events).
- The `ActionItem` DTO should include a denormalised **`joinerName`** (the Inbox shows it). The mock joins it from the case; over HTTP, include it on the action to avoid an N+1.
- `ProcessDefinition.graph` is the nodeweave graph JSON (`CanvasState.toJSON()`). The **compiled/executable spec** the engine runs is defined in **`apps/runway/docs/WORKFLOW-SPEC.md`** + **`apps/runway/docs/workflow-spec.schema.json`**. Port the working compiler in `examples/angular/src/app/ppso/workflow-compiler.ts` (graph→spec) server‑side to emit that shape.

---

## 5. How the frontend calls the backend (the ports + the Result contract)

**Going live = implement each port with an HTTP repository (same interface) and flip one `useExisting` line in the feature's `provide…Feature()`.** Then `RuntimeService`/`ProcessStore`/`persist.ts` retire. The port methods below are your API spec.

| Port (feature) | Methods | Notes |
|---|---|---|
| `ISessionGateway` (`core/auth`) | `currentUser(): Promise<User\|null>` · `login(returnUrl): Promise<void>` · `logout(): Promise<void>` | The BFF/SSO contract — see §6. |
| `ICaseRepository` (cases) | `list(): Promise<Case[]>` · `getByRef(ref): Promise<Case\|null>` · `eventsFor(ref): Promise<DomainEvent[]>` · `create(input): Promise<Result<Case, CreateCaseError>>` | `create` = structured intake (the wizard). |
| `IActionRepository` (actions) | `list()` · `getById(id)` · `resolve(id): Promise<Result<Action, ResolveActionError>>` · `dismiss(id): Promise<Result<Action, DismissActionError>>` | resolve/dismiss advance the case + emit events. |
| `IProcessRepository` (processes) | `list(): Promise<Process[]>` · `publish(input): Promise<Result<Process, PublishProcessError>>` | `input = { pathway, graph }`; publish returns the new version. |
| `IOverviewRepository` (overview) | `listCases(): Promise<Case[]>` · `openActionCount(): Promise<number>` | Or serve a single `GET /overview` summary; the dashboard is a pure projection. |
| `INotificationRepository` (notifications) | `feed(): Signal<Notification[]>` · `lastSeen(): Signal<number>` · `markSeen(at): void` | **Live query** — feed is a projection of the event log; the HTTP impl polls or subscribes (SSE) and pushes into the signal. `lastSeen` is a per‑user preference. |
| `ISettingsRepository` (settings) | `view(): SettingsView` (reactive) · `setAppearance` · `togglePiiReveal` · `setRetentionDays` · `updatePathwayConfig({pathway,patch})` | Appearance = client pref. **PII reveal = governance (§6/§10).** Retention = data policy. **Per‑pathway config = the `{{config.*}}` the engine resolves → server‑owned.** |

### Reads vs. commands (Railway‑Oriented Programming)
- **Reads** (`list`, `getByRef`, …) return a plain value and may **throw** on infrastructure/network failure. The ViewModel runs them through `executeRead`, which flips a `loading` flag and, on throw, shows an **error state with Retry** (or a banner). So: for a genuine outage, **throw / reject** (or map 5xx to a thrown error in the repo).
- **Fallible commands** return `Result<T, E>` (`shared/kernel/result.ts`) where `E` is a discriminated union `{ kind, message, …fields }`. The HTTP repository maps the response to `ok(value)` / `fail({ kind, message })`. **`message` is shown to the user; `kind` drives branching.** Provide both in error bodies.

| Command | Error kind(s) | Suggested HTTP |
|---|---|---|
| `create` case | `InvalidIntake` (`{ reason, message }`) | `422` (or `400`) with `{ kind, reason, message }` |
| `resolve` / `dismiss` action | `ActionNotFound` (`{ id }`) · `AlreadyClosed` (`{ id }`) | `404` · `409` |
| `publish` process | `EmptyProcess` | `422` |

`401` anywhere → the interceptor treats the session as expired and routes to sign‑in (§6). Anything not a modelled business error should be a thrown/5xx so the UI surfaces a generic error + Retry.

---

## 6. Authentication & the BFF (SSO, HttpOnly cookie)

The frontend is built for the agreed **Identity Provider + Backend‑for‑Frontend (BFF)** model with an **HttpOnly, Secure session cookie** — i.e. **SSO, and the SPA holds no tokens.** Seam: `ISessionGateway` in `core/auth` (`MockSessionGateway` active; `BffSessionGateway` written to the contract below — swap it in `provideAuth()`).

**Endpoints the BFF must expose (same‑origin as the SPA):**
- `GET /bff/user` → `200 { id, name, email, org, roles[] }` when signed in, **`401`** otherwise. The SPA probes this once at startup (`provideAppInitializer` → `SessionService.load()`), before routing.
- `GET /bff/login?returnUrl=<path>` → `302` to the IdP. On callback the BFF sets the **HttpOnly Secure SameSite** session cookie and redirects back to `returnUrl`. (The SPA triggers this as a **full‑page navigation**, not XHR.)
- `POST /bff/logout` → clears the session cookie.

**Transport & CSRF:**
- Serve the SPA and reverse‑proxy the API from the **same origin** so the cookie applies. The frontend sends every API call with **`withCredentials`** (see `authInterceptor`).
- **CSRF (double‑submit):** the BFF sets a non‑HttpOnly **`XSRF-TOKEN`** cookie; the frontend echoes it as the **`X-XSRF-TOKEN`** header on mutating requests (Angular `withXsrfConfiguration`, wired in `main.ts`). The BFF must validate it on unsafe methods.
- **`401` on any API call** → `authInterceptor` → `SessionService.handleUnauthorized()` → route to the sign‑in screen (preserving `returnUrl`).

**RBAC & PII (roles/claims):** `User.roles` (or richer claims) drive **who may publish a version**, **who supervises which pathways/cases**, and **who may reveal PII**. Enforce all of these server‑side.

**PII is a governance boundary, not a UI toggle.** Today masking is client‑side (`GovernanceService` + `maskPersonal`, gated by a "Reveal PII" control) — a **mock stand‑in**. In production the backend must **mask/omit personal fields for users without the reveal claim** (don't ship unmasked PII to the client), and treat "reveal" as an **audited authorization action** (emit an audit record; consider returning unmasked data only on an authorized, logged request).

---

## 7. What the backend must provide

### 7.1 Persistence & the API (replace `localStorage`, implement the §5 ports)
A governed datastore for **process versions, cases, events, actions**, plus a read/write API the port repositories call.
- Event store is **append‑only, immutable**. Cases are projections.
- One canonical record per case (**dedup**, BR‑02) even across multiple intake messages/updates.

### 7.2 Structured intake (the ONLY entry point) — backs `ICaseRepository.create`
- Accept work **only** from approved structured sources (forms/APIs/controlled feeds) with an explicit `requestType` and `schemaVersion`.
- Validate against the schema; on failure **reject/quarantine/route to human triage** — emit `intake.rejected` and, where relevant, create a `triage` `ActionItem`. **Never infer whether free‑form text is onboarding‑related.** Return `InvalidIntake` (§5) for a client‑submitted intake that fails validation.
- Completeness/quality gate (BR‑03): block downstream orchestration when required fields are missing/conflicting; set `waiting-for-info` / `exception` with a clear reason.

### 7.3 The orchestration engine (deterministic)
- Execute a **published `ProcessVersion`** for a case: sequencing, **branches** (gate `valid/missing/invalid`), **waits** (suspend/resume on data arrival), fan‑out to readiness items, SLA timers, escalation policy, and **outcome‑based closure** (`ready-for-day-1`/`completed` only when readiness outcomes are confirmed — not when a ticket is created).
- Every step emits a `DomainEvent`. This engine is **not** an LLM; it must be predictable, explainable, replayable.
- Cases pin the `processVersion` they started on (don't disturb in‑flight cases when a new version publishes).

### 7.4 Integrations (reference, don't duplicate)
Adapter per system; each declares an explicit data‑movement contract (what moves, why, retention, deletion). Graceful degradation: if a system is down, preserve case state and surface it (the UI already renders per‑item blockers + a page‑level error state).
- **Graph API:** Teams membership, M365/Viva Engage groups, mailing lists (where Graph‑accessible), Outlook mail, Planner (if retained), SharePoint resource‑list writes (as an *output*).
- **Human‑assisted (API‑less):** CDP RORO, MyTE WBS, org chart — the agent **prepares** (pre‑filled block + link) and a human executes; record the outcome. Model as `fulfilment: 'agent-assisted' | 'human'` items → `human-task` actions in the Inbox.
- **Known blocker (BRD):** IT must confirm which mailing lists / Engage groups are Graph‑accessible vs WebAdmin‑only. Until confirmed, degrade those to prepared human actions.

### 7.5 The LLM — at the edges only
Permitted: parse an **explicitly submitted** structured request into fields; draft comms in the template voice; summarize readiness/blockers **traceable to evidence**; suggest an exception resolution (as a proposed action); answer "what's at risk?" from the event log; assist authoring in Compose.
**Forbidden:** any irreversible/external action without a deterministic rule *or* human approval; deciding policy (SLAs, escalation, owner rules, which items); accepting/guessing intent from unstructured comms.

### 7.6 Governance & security (non‑negotiable — PRODUCT-VISION §11 + `data-dictionary.ts`)
Classify before processing · minimum‑necessary data (reference don't duplicate) · **protect PII by default — mask/omit server‑side for users without the reveal claim, and audit every reveal (§6)** · keep authoritative systems authoritative · least privilege + need‑to‑know · environment separation (synthetic data outside prod) · explicit data‑movement contracts · permission‑aware retrieval if you add search/embeddings · **log decisions & actions** (classification, extracted fields, validation, transitions, tool calls, task creation, escalations, overrides, closures, **PII reveals, sign‑ins**) without leaking PII into logs · control autonomous actions · validate outputs before reliance · monitoring (schema failures, rejects, failed integrations, exception/duplicate rates, access anomalies, stale tasks, unresolved blockers) · every case has business/technical/exception owners + audit.

---

## 8. Proposed API surface (aligned to the §5 ports)

Design REST/RPC as you prefer; these are the operations the UI needs. Error bodies carry `{ kind, message, …fields }` per §5.

- **Auth (BFF):** `GET /bff/user` · `GET /bff/login?returnUrl=` · `POST /bff/logout` (see §6).
- **Intake:** `POST /intake` (structured payload + `requestType` + `schemaVersion`) → validates, dedups to a case, emits events; on failure `422` `InvalidIntake` or `intake.rejected` + triage action.
- **Cases:** `GET /cases`, `GET /cases/{caseRef}`, `GET /cases/{caseRef}/events`.
- **Actions (Inbox):** `GET /actions?status=open`, `POST /actions/{id}/resolve`, `POST /actions/{id}/dismiss` (emit events + may advance the case; `404` `ActionNotFound`, `409` `AlreadyClosed`).
- **Processes:** `GET /processes/{pathway}` (published), `POST /processes/{pathway}/publish` (body: graph JSON) → new version (`422` `EmptyProcess` if no steps).
- **Notifications / live feed:** a projection of the event log (poll `GET /events?since=` or SSE) + a per‑user `lastSeen` marker (`GET`/`PUT`).
- **Config:** `GET`/`PUT /config/{pathway}` (the engine's `{{config.*}}` — owners, escalation, SLA offsets); retention as a data‑policy setting.
- **Reporting:** `GET /reports/...` (cycle time, readiness completion rate, exception volume, blocker categories, cases at risk, duplicate rate, rejected‑input rate) — all queryable from the event log.

---

## 9. Non‑negotiables (guardrail checklist)

- [ ] Work enters **only** via structured intake; unstructured/ambiguous → reject/triage. No intent‑guessing.
- [ ] One canonical readiness record per case (dedup).
- [ ] Deterministic engine runs the regulated core; LLM only at the edges (§7.5).
- [ ] Authoritative systems stay authoritative; store **references + state + outcomes**, minimize data movement.
- [ ] Event log is append‑only; live state + audit + reporting are projections of it.
- [ ] Outcome‑based closure (not "ticket created").
- [ ] Everything the agent does is legible, reversible, audited; sensitive/ambiguous/policy actions require a human.
- [ ] **Auth is BFF + IdP + HttpOnly cookie; the SPA never receives or stores tokens; CSRF double‑submit enforced; PII masked/omitted server‑side by claim and reveals audited.**
- [ ] Business errors returned as typed `{ kind, message }` with the status codes in §5; outages surface as thrown/5xx.
- [ ] Classification + least privilege + env separation + PII protection + permission‑aware retrieval enforced by design.

---

## 10. Open decisions for the backend

- Runtime hosting: bespoke service vs Power Platform vs Copilot Studio vs hybrid — chosen against Graph‑permission, security, operability, cost.
- Datastore + event store technology; retention/residency per Accenture policy (the event log holds PII: EID, dates, names).
- **Decided:** identity via **IdP + BFF + HttpOnly cookie (SSO)** — see §6. **Still to define:** the concrete IdP (Entra ID?), the **claim/role names** that gate publish / supervise‑by‑pathway / **PII‑reveal**, and least‑privilege service accounts for connectors.
- Live feed transport: **polling vs SSE/WebSocket** for the notifications feed + live case state; where `lastSeen` is stored (per‑user).
- Overview: a server‑computed `GET /overview` summary vs. the client projecting from `listCases` + `openActionCount`.
- Confirm keep/reference per system (esp. who consumes SharePoint resource lists; whether Planner is relied on beyond onboarding).
- Intake contract(s) per pathway (fields + schema versioning).

---

## 11. Repo map (read these first)

- `examples/angular/src/app/ppso/PRODUCT-VISION.md` — the vision (v2), incl. governance (§11) and BR‑01…08 traceability (§19). **Start here.**
- `apps/runway/docs/WORKFLOW-SPEC.md` + `apps/runway/docs/workflow-spec.schema.json` — the compiled workflow spec the engine runs (contract + JSON Schema + execution semantics + worked example).
- `apps/runway/src/app/domain/model.ts` — the DTO contract (§4). `…/domain/data-dictionary.ts` — classification + owned/referenced + `maskPersonal`.
- **`apps/runway/src/app/features/*/application/ports/`** — the seam interfaces + DI tokens (§5). Each feature's `*.providers.ts` binds the port; `src/main.ts` is the composition root.
- **`apps/runway/src/app/features/*/infrastructure/repositories/`** — the mock repositories (wrap `RuntimeService`/`ProcessStore`). Replace with HTTP repositories against the same ports.
- `apps/runway/src/app/core/auth/` — `session.gateway.ts` (port), `bff-session.gateway.ts` (the intended BFF impl), `session.service.ts`, `auth.guard.ts`; `core/interceptors/auth.interceptor.ts` — the BFF/SSO seam (§6).
- `apps/runway/src/app/shared/kernel/result.ts` — the `Result`/error contract (§5).
- `apps/runway/src/app/runtime/{runtime.service.ts,process-store.ts,persist.ts}` — the mock stores the repositories wrap; retire once HTTP repositories land.
- `apps/runway/src/app/features/processes/ui/process-graph.ts` — how a published graph is rendered + lit (`buildCaseMap`); **keep as‑is**, feed it the server's published `ProcessDefinition.graph`.
- `examples/angular/src/app/ppso/workflow-compiler.ts` — a working graph→spec compiler to port server‑side. `…/simulator.ts` — reference for branch/wait execution semantics.

---

## 12. Acceptance

Map your implementation to the Centre‑Level BRD **BR‑01…08** and acceptance criteria (traceability table in PRODUCT-VISION §19), and to the success metrics in §18: manual minutes ≈ 0 for automated steps, shorter/consistent time‑to‑ready, rising % fully automated, config/process changes with **zero developer tickets**, falling overdue/escalation rate, and the litmus test — *nobody opens a SharePoint list to find out what's happening.*
