# Runway — Compiled Workflow Spec (v1)

**What this is:** the executable, layout‑free spec the **deterministic engine** runs. It is *compiled* from a published `ProcessDefinition.graph` (the nodeweave canvas JSON). The UI authors graphs; the engine runs specs; this is the contract between them.
**Formal schema:** [`workflow-spec.schema.json`](./workflow-spec.schema.json) (JSON Schema 2020‑12) — validate every compiled spec against it.
**Companion:** [`../BACKEND-HANDOFF.md`](../BACKEND-HANDOFF.md) (contracts + what to build), `examples/angular/src/app/ppso/workflow-compiler.ts` (a working graph→spec compiler to port server‑side).

---

## 1. Pipeline

```
Compose (author graph) ──publish──▶ ProcessDefinition { pathway, version, graph, publishedAt }
                                            │  compile (strip layout; derive transitions, SLAs, closure)
                                            ▼
                                     WorkflowSpec (this schema)  ──run──▶ deterministic engine
                                                                              │ emits DomainEvents
                                                                              ▼
                                                                        cases + audit + reporting
```

The compiler is a pure function `graph → WorkflowSpec`. It must be deterministic and reversible enough that a spec always traces back to a graph+version. Cases **pin** the spec `metadata.version` they started on.

---

## 2. The contract (TypeScript)

Authoritative validation is the JSON Schema; these types are the readable contract and align 1:1 with it.

```ts
interface WorkflowSpec {
  apiVersion: 'runway.dev/v1';
  kind: 'OnboardingProcess';
  metadata: { name: string; pathway: 'project-level' | 'centre-level'; version: number; publishedAt?: string; source?: Record<string, unknown>; };
  triggers: Trigger[];
  steps: Step[];
  closure?: Closure;
  monitoring?: Monitoring;
}

interface Trigger {
  id: string;
  type: 'record.submitted' | 'schedule' | 'field.changed';
  name?: string;
  with?: { intakeSource?: string; schemaVersion?: string; cron?: string; field?: string };
  next: string[];               // step ids to start
}

type StepKind = 'gate' | 'wait' | 'action' | 'task' | 'monitor' | 'notify' | 'join';

interface Step {
  id: string;
  type: string;                 // fully-qualified node type, e.g. 'action.provision'
  kind: StepKind;
  name?: string;
  fulfilment?: 'auto' | 'agent-assisted' | 'human';   // action/task only — the agent boundary
  produces?: { itemId: string; category: ReadinessCategory };  // links a step to a ReadinessItem
  owner?: string;               // binding, e.g. '{{config.cdp_owner_email}}'
  with?: Record<string, unknown>;      // params; values may be {{bindings}}
  sla?: Sla;
  transitions: { next: string[] } | { on: Record<string, string[]> };  // 'on' = gate outcomes
  audit?: { events: EventType[] };     // minimum events the engine must emit
}

interface Sla {
  dueOffsetDays?: number | string;     // relative to record.startDate
  remindAfterHours?: number;
  escalateAfterHours?: number;
  escalateTo?: string;                 // binding
  accelerateWhenStartWithinHours?: number;
  accelerateTo?: string;               // binding
}

interface Closure {                    // outcome-based (BR-08)
  requireAll?: string[];               // step ids that must be 'done'
  condition?: string;
  confirmation?: { via: 'email'; to: string; subject?: string; includeNA?: boolean };
}

interface Monitoring {                 // cross-cutting, driven by a schedule trigger (BR-07)
  schedule?: string;                   // cron
  remindAfterHours?: number;
  escalateAfterHours?: number;
  escalateTo?: string;
  accelerateWhenStartWithinHours?: number;
  accelerateTo?: string;
  noDuplicateSameDay?: boolean;
}
```

`EventType` / `ReadinessCategory` are the same enums as `apps/runway/src/app/domain/model.ts` (the case/event contract). A step's `produces.itemId` is the id of the `ReadinessItem` it realizes on the case — this is how the engine's steps and the UI's readiness items stay in lockstep.

---

## 3. Bindings & expressions

Any string value may be a template with `{{ path }}` segments, resolved at runtime against a **read‑only context**:

| Namespace | Meaning | Example |
|---|---|---|
| `record.*` | the canonical readiness record fields | `{{record.startDate}}`, `{{record.joinerName}}` |
| `config.*` | the Project Config List row for the case | `{{config.cdp_owner_email}}`, `{{config.teams_channel_ids}}` |
| `item.*` | the current readiness item (in a step that realizes one) | `{{item.label}}` |
| `joiner.*` | referenced person attributes (from HR/IAM, not copied) | `{{joiner.email}}` |
| `now` | server time | `{{now}}` |

Rules: binding resolution is **read‑only** (never writes authoritative systems); unresolved bindings are a validation error surfaced as a blocker (`missing-info`), never silently blank; personal values obey classification (see `data-dictionary.ts`) — masked in logs.

Gate **outcomes** (`transitions.on` keys) are *not* expressions in the spec — the gate step's deterministic logic (in the engine, parameterised by `with`) decides the outcome and the engine follows the matching branch. The spec only declares the outcome→successor mapping.

---

## 4. Execution semantics (per kind)

The engine is deterministic and replayable. Every step emits at least its `audit.events`.

- **Trigger `record.submitted`** — the single structured entry. Validate the payload against `with.schemaVersion`; **dedup** to one canonical case (BR‑02). On pass: `case.created` + `validation.passed`, start `next`. On schema failure: `intake.rejected` (no case, or quarantined) — never infer intent.
- **Trigger `schedule`** — recurring; drives `monitoring`. **Trigger `field.changed`** — a resume signal (e.g. EID provided) that wakes a suspended `wait`.
- **`gate`** (e.g. `gate.validate`) — evaluate the outcome deterministically from `with` (e.g. mandatory‑field/EID checks) → pick the `on` key (`valid`/`missing`/`invalid`) and follow it. Emit `validation.passed`/`validation.failed`. `missing` → set case `waiting-for-info` and typically route to `wait`; `invalid` → reject path (+ `exception.raised`, human triage).
- **`wait`** (`wait.pending`) — **suspend** the branch; resume when `with.resumeOn` is satisfied (often via a `field.changed` trigger). While suspended, `sla` reminders/escalations still apply. On resume, follow `next`.
- **`action`** — a provisioning/notification step realizing a `produces` item.
  - `fulfilment: 'auto'` → engine calls the integration **adapter** (§Integrations in the handoff). Success → `item.completed`, item `done`. Failure → `item.blocked` + retry once, then fall back to a prepared **human task** (create an `ActionItem`).
  - `fulfilment: 'human'` → create a `human-task` `ActionItem` immediately; on human resolve → `item.completed`.
- **`task`** (`task.prepare`) — `fulfilment: 'agent-assisted'`: the agent **prepares** (copy‑paste block + link) → `item.prepared` + a `human-task` `ActionItem`; on human resolve → `item.completed`. (CDP RORO, MyTE WBS, org chart.)
- **`notify`** — send comms (email/Teams). Body may be **LLM‑drafted** in the project's template voice; **content is traceable to evidence and reviewable**. Emits a send event.
- **`join`** (`gate.allComplete`) — proceeds only when its completion condition is met (all incoming steps `done`, per `closure.requireAll`), then `next`.
- **Closure** — the case reaches `ready-for-day-1`/`completed` **only** when `closure.requireAll` items are confirmed `done` (outcome‑based, BR‑08). The confirmation `notify` sends the summary (granted access, N/A items) — `case.completed`.
- **Monitoring** — on `monitoring.schedule`, scan open items across active cases: at `remindAfterHours` → reminder to the owner; at `escalateAfterHours` → escalate to `escalateTo`; if start date within `accelerateWhenStartWithinHours` and items open → escalate to `accelerateTo`. `noDuplicateSameDay` prevents repeat reminders; reminders stop when the item completes.

**Autonomy rule (binding):** a step runs autonomously only when `fulfilment: 'auto'` *and* the action is reversible/low‑risk *and* permissions are explicit. Anything ambiguous, high‑impact, or policy‑sensitive becomes an `ActionItem` for a human. The LLM never performs an autonomous irreversible/external action and never decides policy.

---

## 5. Node type → spec step mapping

Compiler mapping from the Compose catalog (`apps/runway/src/app/compose/process-catalog.ts`) to spec steps:

| Compose node type | Spec | Notes |
|---|---|---|
| `trigger.recordSubmitted` | Trigger `record.submitted` | carries `intakeSource`, `schemaVersion` |
| `trigger.schedule` | Trigger `schedule` | populates `monitoring.schedule` |
| `gate.validate` | Step `kind: gate` | `transitions.on` from labeled ports `valid`/`missing`/`invalid` |
| `gate.allComplete` | Step `kind: join` | feeds `closure.requireAll` |
| `wait.pending` | Step `kind: wait` | `with.resumeOn`, `sla` |
| `action.provision` | Step `kind: action` | `fulfilment` from `with.via` (auto/human); `produces` |
| `action.notify` | Step `kind: notify` | channel/template/to |
| `task.prepare` | Step `kind: task` | `fulfilment: agent-assisted`; `produces` |
| `monitor.sla` | Step `kind: monitor` (+ `monitoring`) | reminder/escalation policy |
| `notify.confirm` | Step `kind: notify` + `closure.confirmation` | completion email |

`produces.itemId` = the node id; the compiler must ensure action/task node ids equal the readiness item ids on cases of that pathway (already aligned in the Compose templates).

---

## 6. Worked example (centre‑onboarding, compiled)

```yaml
apiVersion: runway.dev/v1
kind: OnboardingProcess
metadata:
  name: centre-onboarding
  pathway: centre-level
  version: 1
  publishedAt: "2026-07-11T03:49:00Z"

triggers:
  - id: onSubmit
    type: record.submitted
    with: { intakeSource: "Intake form", schemaVersion: "v2" }
    next: [validate]
  - id: onSchedule
    type: schedule
    with: { cron: "0 9 * * *" }
    next: [monitor]

steps:
  - id: validate
    type: gate.validate
    kind: gate
    name: Validate & complete
    with:
      mandatoryFields: "EID, start date, role, location, pathway"
    audit: { events: [validation.passed, validation.failed] }
    transitions:
      on:
        valid:   [laptop, m365, desk, orientation, buddy]
        missing: [wait]
        invalid: [reject]

  - id: wait
    type: wait.pending
    kind: wait
    name: Wait for information
    with: { resumeOn: "required field provided" }
    sla: { escalateAfterHours: 48, escalateTo: "{{config.requester}}" }
    transitions: { next: [laptop, m365, desk, orientation, buddy] }

  - id: reject
    type: notify.reject
    kind: notify
    name: Reject & notify
    with: { channel: email, to: "{{config.requester}}", reason: "invalid submission" }
    transitions: { next: [] }

  - id: laptop
    type: action.provision
    kind: action
    name: Laptop provisioned
    fulfilment: auto
    produces: { itemId: laptop, category: equipment }
    owner: "IT Assets"
    with: { target: "laptop", via: "auto (API)" }
    sla: { dueOffsetDays: -2, remindAfterHours: 24, escalateAfterHours: 48, escalateTo: "{{config.escalation}}" }
    audit: { events: [item.started, item.completed, item.blocked] }
    transitions: { next: [allDone] }

  - id: m365
    type: action.provision
    kind: action
    name: M365 account & licences
    fulfilment: auto
    produces: { itemId: m365, category: access }
    owner: "IAM"
    with: { target: "m365", via: "auto (Graph)" }
    transitions: { next: [allDone] }

  - id: desk
    type: task.prepare
    kind: task
    name: Workspace / desk
    fulfilment: human
    produces: { itemId: desk, category: workspace }
    owner: "Facilities"
    with: { system: "Facilities" }
    sla: { dueOffsetDays: -3 }
    transitions: { next: [allDone] }

  - id: orientation
    type: action.notify
    kind: notify
    name: Orientation session
    fulfilment: auto
    produces: { itemId: orientation, category: orientation }
    with: { channel: teams, to: "{{joiner.email}}", template: "{{config.comms_template}}" }
    transitions: { next: [allDone] }

  - id: buddy
    type: action.provision
    kind: action
    name: Buddy assigned
    fulfilment: auto
    produces: { itemId: buddy, category: stakeholder }
    with: { target: "buddy", via: "auto (API)" }
    transitions: { next: [allDone] }

  - id: allDone
    type: gate.allComplete
    kind: join
    name: All ready?
    transitions: { next: [confirm] }

  - id: confirm
    type: notify.confirm
    kind: notify
    name: Completion
    with: { channel: email }
    audit: { events: [case.completed] }
    transitions: { next: [] }

  - id: monitor
    type: monitor.sla
    kind: monitor
    name: Monitor & escalate
    transitions: { next: [] }

closure:
  requireAll: [laptop, m365, desk, orientation, buddy]
  condition: "all readiness outcomes confirmed"
  confirmation:
    via: email
    to: "{{record.joinerName}}, {{config.leads}}, {{config.onshore_contacts}}"
    subject: "Ready for Day 1 — {{record.joinerName}}"
    includeNA: true

monitoring:
  schedule: "0 9 * * *"
  remindAfterHours: 24
  escalateAfterHours: 48
  escalateTo: "{{config.project_pmo_email}}, {{config.project_lead_email}}"
  accelerateWhenStartWithinHours: 24
  accelerateTo: "PPSO Head"
  noDuplicateSameDay: true
```

---

## 7. Validation & versioning

- Validate every compiled spec against `workflow-spec.schema.json` before it's accepted by the engine.
- Additional engine‑side invariants (beyond JSON Schema): every `transitions` target and `trigger.next` id exists; the graph is acyclic (waits model suspension, not back‑edges); each `produces.itemId` is unique within a pathway; every `on` key corresponds to a real gate outcome; `closure.requireAll` ids exist.
- `metadata.version` is monotonic per pathway; publishing a new version never mutates in‑flight cases (they keep their pinned version).
- Keep the spec **layout‑free and diff‑friendly** — it should read as a governance artifact reviewers can diff in version control.
