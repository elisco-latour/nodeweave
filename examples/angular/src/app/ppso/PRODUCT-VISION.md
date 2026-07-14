# Onboarding Readiness Orchestration — Product Vision & Design

**Status:** Draft **v2** (supersedes v1) · **Owner:** Koffi Eli Kponblanou · **Audience:** PPSO team (Accenture Mauritius), stakeholders, engineering
**Date:** 2026‑07 · **Informed by:** *Project‑Level Onboarding* user stories + *Centre‑Level — Transformational Onboarding Readiness Agent* BRD · **Prototype:** `examples/angular/src/app/ppso`

> A living proposal, not a spec to build verbatim. **v2** folds in the Centre‑Level BRD, which validated the direction and sharpened it in five ways: readiness is the core object; **structured intake first — never guess intent**; **authoritative systems stay authoritative** (reference, don't duplicate); **governance is a first‑class pillar**; and closure is **outcome‑based**.

---

## 0. In one paragraph

Build one **onboarding readiness orchestration platform** for Accenture Mauritius that serves multiple onboarding pathways — **project‑level** and **centre‑level** today, others later — each expressed as a versioned, no‑code **process**. Work enters only through **approved structured intake**; the agent turns it into a **canonical readiness record**, validates completeness, determines the required readiness package from business rules, orchestrates actions **across existing authoritative systems** (referencing, not duplicating, their data), surfaces blockers before Day 1, and routes exceptions to humans with context and a recommended action. Humans **compose/evolve** the process visually and **supervise** execution through a calm **Action Inbox** and a **live readiness view** — never a chatbot, never an admin panel. A deterministic engine runs the regulated core; the LLM helps only at the edges under explicit governance. The product owns the readiness/orchestration layer and an **immutable event log** (state + audit + reporting); it is *not* the system of record for people, access, or equipment.

---

## 1. Two onboarding tracks, one problem

**Project‑level** (lead‑triggered: tool access, mailing lists, CDP RORO, Teams, WBS — per‑project config) and **centre‑level** (readiness: equipment, access, workspace, orientation, stakeholder assignment) are two onboarding pathways with the *same* underlying pain: people interpret messages, copy data between tools, remember timing rules, raise actions, chase missing info, and hand‑maintain visibility. They are **two processes on one platform** — which is precisely why a visual process composer over a shared engine (plus shared governance and reporting) is the right foundation, not two bespoke automations.

---

## 2. The transformation thesis

Engineering for business transformation is **not** porting the current process into software that behaves the same way. It is handling the genuinely hard parts programmatically and easing what was difficult. Some systems stay; some don't need to.

The tell was SharePoint "to share data and report later" — a **crutch** recreating the filing cabinet. Sharing and reporting are outcomes the product provides natively.

### The refined test — keep / reference / replace / handle

Apply to every system and every step:

| Kind | Verdict | In the transformed system |
|---|---|---|
| **Authoritative system others depend on** — HR, IAM, asset/equipment, ticketing, Teams, Outlook, CDP, MyTE, MMS | **Keep & reference** | The agent orchestrates across it and stores only **references + state + outcomes**; it never becomes the system of record, and minimizes data movement |
| **Crutch for the team's own data / coordination / visibility** — SharePoint lists, manual trackers, "check my mailbox" | **Replace** | The readiness layer + role‑aware views + push + native reporting |
| **Genuinely hard work** — dependency tracking, timing rules, dedup, blocker detection, follow‑ups, visibility | **Handle programmatically** | The agent + the event log |
| **A step that exists only because info is fragmented / timing is manual / no visibility** | **Redesign or eliminate** | — |
| **A step that is control, approval, accountability, or exception judgment** | **Keep, made explicit** | Modelled as a gate/approval with better context |

**In one line:** authoritative systems stay authoritative and are *referenced*; the crutches are *replaced*; the hard parts are *handled*; and the agent is an **orchestration layer after trusted, structured input** — never an interpreter of free‑form email.

---

## 3. Product principles (merged)

From the vision + the BRD's design principles:

1. **Transform the work, not the screen.** Redesign around outcomes, decisions, dependencies, and exceptions — not the old sequence of clicks; not a tab per table.
2. **Structured input first; never guess intent.** Work enters only through approved forms/templates/APIs/feeds. Ambiguous or unstructured input is rejected or routed to human triage — the agent must not infer or hallucinate onboarding intent.
3. **Make readiness measurable.** Every case has explicit readiness items, blockers, owners, dates, and a confidence — not email interpretation.
4. **Automate the deterministic; escalate the judgment.** Validation, dedup, status, reminders, task initiation, routing → programmatic. Ambiguous/high‑impact/policy‑sensitive → human.
5. **The AI acts on a visible artifact; the human supervises.** No free‑floating chatbot: AI co‑edits the process and drafts/prepares work — always *propose → show → approve*.
6. **Keep authoritative systems authoritative; minimize data movement.** Reference source‑system data; persist only the operational fields readiness needs.
7. **The system tells you what needs you.** An Action Inbox surfaces the few decisions and human‑only steps; nobody patrols a dashboard.
8. **Everything is legible, reversible, and audited.** If you can't see what the agent did, why, and undo it, it doesn't ship.
9. **No‑code evolution.** Readiness rules, due dates, escalation thresholds, categories, owner mappings, templates — configurable without touching core code.
10. **Calm, focused, restrained.** Command bar over nav sprawl; one object in focus; progressive disclosure. The bar is set by the best‑designed apps of this era.

### Explicit anti‑patterns (we will NOT build)
Admin panel with a sidebar per entity · a chatbot bolted onto a graph editor · SharePoint/any list as the database · a BI dashboard as the operator's home · forms‑everywhere CRUD · an agent that reads unstructured email and guesses intent · an LLM performing regulated actions without a rule or a human.

---

## 4. Who it's for (actors)

- **Onboarding request source** — provides intent/updates/cancellations via approved channels; needn't understand downstream readiness.
- **Process owner** (PPSO centre / designer) — authors and evolves the process → **Compose**.
- **Onboarding operations owner** — focuses on exceptions, policy‑sensitive decisions, alignment, improvement; the **Action Inbox** is theirs.
- **Project PMO / Lead** — starts and supervises project‑track onboardings; performs the human‑only steps (CDP paste, org chart); maintains project config.
- **Support delivery teams** — receive clean, deduplicated readiness tasks; signal completion back.
- **Stakeholders / leadership** — consume readiness visibility + blocker alerts + reporting.
- **New joiner** — read‑only case transparency; day‑1 ready.

Two‑tier authoring holds: owners compose the shared process; per‑project/per‑pathway **config** is maintained via a form or guided assistant — not hand‑drawn graphs.

---

## 5. The system at a glance

```
  Structured intake ─▶ Canonical readiness record ─▶ Compose (author/version) │ Operate (agent + supervision)
  (forms · APIs ·        (one per case: state ·          ▲                       │  · agent orchestrates readiness
   templates · feeds)     items · blockers · owners ·    │ every action → event  │  · live readiness view (canvas)
   reject/triage if        references — not copies)       └───────────────────────┘  · Action Inbox (exceptions)
   non-conforming                       │
                                        ▼
   Integrations the agent REFERENCES/feeds (HR · IAM · assets · ticketing · Teams · Outlook · CDP · MyTE)
                                        │
                        Reporting & observability (live, from the event log)

        ── all of the above wrapped in Governance: classification · least privilege · audit · monitoring ──
```

---

## 6. Core concepts (domain model)

- **Process / ProcessVersion** — a named onboarding pathway (project‑level, centre‑level…), versioned and immutable once published; cases run a specific version. Readiness packages are rule‑driven, not hard‑coded.
- **Node / Step** — typed unit: trigger, gate, wait, automated action, agent‑assisted task, iterator, branch, monitor, notify — each with a config schema and **variable bindings** (`{{record.*}}`, `{{config.*}}`).
- **Canonical readiness record** (the "Case") — **one per onboarding case** (dedup, BR‑02), holding **only** operational readiness fields + references:
  - case reference · **request type** (New / Update / Cancellation / Exception, explicit) · joiner reference (non‑sensitive) · intake source + schema version · start date + readiness deadline · **required readiness items** (equipment, access, workspace, orientation, stakeholder assignment, …) · **readiness state** · **blockers** · **task references** (links into source systems, no copies) · **accountability** (current / next‑action / escalation owner) · **audit trail**.
- **Readiness state machine:** `Draft → Waiting for Required Information → Ready for Orchestration → In Progress → Blocked → Ready for Day 1 → Completed | Cancelled | Exception`.
- **Blocker** — missing info, conflicting info, failed integration, overdue task, cancelled request, or manual‑review‑required.
- **Event** — immutable, timestamped fact about a case; the single stream behind live state, audit, and reporting.
- **Action / Exception** — a unit of human supervision (approve, decide, or execute a human‑only step), carrying reason + evidence + impacted items + recommended next action.

Design consequence: the record stores **references + orchestration state + outcomes**, never copies of authoritative data; live state and audit are projections of the same event stream.

---

## 7. Compose — the Process Studio

For process owners. The visual authoring surface (built).
- **Author** from a step catalogue (built): triggers, gates with real **branch ports**, **wait** states, automated actions, agent‑assisted tasks, monitor, confirm; each configured via a **schema‑driven inspector**, values as literals or **bindings**. Readiness packages are expressed as rules (by location, role, start date, pathway…).
- **AI co‑editor** (right way): describe a change → it edits the artifact you're looking at as a reviewable **diff on the canvas** → you approve. Not a side chat.
- **Dry‑run** (built): simulate a scenario (e.g. valid / missing / invalid) — branch taken, wait pauses/resumes, edges animate then settle — to gain confidence before publishing.
- **Publish** a version; running cases keep theirs.
- **Compile** to a canonical, reviewable spec (built: graph → YAML) that the runtime executes.

---

## 8. Operate — the readiness runtime

For the operations owner and PMOs. The heart of the transformation.

1. **Structured intake** (BR‑01): create/update/cancel via approved forms/templates/APIs/feeds; **request type is explicit**. Non‑conforming input is **rejected, quarantined, or routed to human triage** — never inferred.
2. **Canonical record** (BR‑02): one per case; multiple messages/updates converge; duplicates prevented.
3. **Completeness & quality checks** (BR‑03): validate required fields, flag missing/conflicting; **block downstream orchestration** and set *Waiting for Required Information* / *Exception* with a clear explanation.
4. **Determine the readiness package** (BR‑04) from configurable rules.
5. **Orchestrate** (BR‑04): initiate/update/monitor readiness tasks **in the existing systems**, storing only references + state; no duplicate/parallel tasks.
6. **Live readiness view** (BR‑06): the same visual process, **read‑only and lit up** with the case's real state — items, blockers, owners, dates, completion confidence — with events/outputs inline.
7. **Proactive intervention** (BR‑07): detect risk **before Day 1** (missing identifiers, stale tasks, unresolved blockers, duplicates, late changes) → reminders / escalation.
8. **Exception routing** (BR‑05): to the right human via the **Action Inbox**, each item carrying reason, evidence, impacted readiness items, and a recommended next action, prepared for one/two‑click completion.
9. **Outcome‑based closure** (BR‑08): *Ready for Day 1* / *Completed* only when readiness **outcomes are confirmed** — not because a ticket was created or a message answered.

The agent is autonomous for reversible/low‑risk work and **pauses for a human** for anything sensitive, ambiguous, policy‑touching, or human‑only — a boundary set per step in the process, not left to chance.

---

## 9. The agent boundary (agentic *and* governed)

Two engines, clearly divided:
- **Deterministic orchestration engine** runs the compiled ProcessVersion: sequencing, branches, waits/resumes, SLAs, escalation, dedup, audit. Predictable and explainable — not an LLM.
- **LLM at the edges only:** draft comms in the project's voice; summarize readiness/blockers **traceable to underlying evidence**; assist authoring (the Compose co‑editor); explain a case / answer "what's at risk?" from the event log; and **extract fields from an explicitly‑submitted structured request**.

**Hard rules (non‑negotiable):**
- No work from unstructured comms; the agent never infers onboarding intent — ambiguous/free‑form → reject or route to triage.
- The LLM never performs an irreversible/external action without a deterministic rule **or** human approval; policy (SLAs, escalation, owner rules, which readiness items) lives in config/process, never in model discretion.
- Autonomous actions only where rules + permissions are explicit; **ambiguous, high‑impact, policy‑sensitive, or conflicting → human**.
- Outputs that may affect an onboarding outcome must be **traceable to evidence and designed for human review**.

---

## 10. Data & events — owned vs. referenced

- **Owned (source of truth):** the readiness/orchestration layer — processes/versions, canonical readiness records, config, and the **immutable event log**.
- **Referenced (NOT owned):** people, access, equipment, tickets — they remain in the authoritative enterprise systems (HR/IAM/asset/ticketing/M365). The record holds references + outcomes; data movement is minimized and explicit.
- **The event log** powers three things from one stream: live case state (projection), audit trail (verbatim), and reporting/analytics (aggregations).
- **SharePoint** as the team's own store is replaced; where a downstream tool genuinely reads a SharePoint resource list, the agent writes it as an *output* (recorded as an event), not as our memory.

---

## 11. Governance, security & data design (first‑class pillar)

Design constraints from the BRD — to be honoured in architecture, data models, and integrations, not added later:

- **Classify before processing** — every data element has a classification + handling rule before it is stored, transformed, indexed, embedded, logged, or shared.
- **Minimum necessary data** — persist only fields readiness needs; reference rather than copy.
- **Protect PII by default** — access control, masking, encryption, retention, and disposal for identifiers, onboarding attributes, task details, operational metadata.
- **Keep authoritative systems authoritative** — the agent is never the system of record for people/access/equipment/tickets.
- **Least privilege & need‑to‑know** — users, services, connectors, and agent tools access only what their role requires; privileged access separated, logged, reviewed, revocable.
- **Environment separation** — dev/test/stage/prod isolated; synthetic/anonymized data outside prod unless controlled production use is approved.
- **Explicit data‑movement contracts** — every integration defines what moves, why, where it's stored, who can access it, retention, and deletion/archival.
- **Govern retrieval & knowledge** — if search/embeddings/vector storage are used, indexed content preserves sensitivity metadata, retrieval is permission‑aware, and users never receive content they aren't authorized to see.
- **Log decisions & actions** — classification, extracted fields, validation, state transitions, tool calls, task creation, escalations, overrides, closures — auditable without leaking unnecessary PII into logs.
- **Control autonomous actions** — deterministic + permitted only; else route to a human.
- **Validate outputs before reliance** — summaries/blocker explanations/updates/recommendations trace to evidence and are review‑ready.
- **Ongoing monitoring** — data quality, schema‑validation failures, rejected inputs, failed integrations, exception/duplicate rates, access anomalies, stale tasks, unresolved blockers.
- **Preserve accountability** — every case has a business owner, technical owner, exception owner, and audit trail; the agent supports accountability, it does not remove human ownership of policy/access/exception decisions.

---

## 12. Integrations

Orchestrate **across** authoritative systems, referencing their data:
- **Microsoft Graph** where reachable: Teams membership, M365/Viva Engage groups, mailing lists (Graph‑accessible), Outlook, Planner (if retained), SharePoint resource‑list writes.
- **Human‑assisted** where API‑less: **CDP RORO**, **MyTE WBS**, **org chart** — agent prepares (pre‑filled block + link), a human executes, the system records the outcome.
- **Resilience (NFR):** degrade gracefully when a source/ticketing/data system is unavailable; **preserve current case state**.
- **Project/pathway exceptions** (e.g. CACF's CDP handled in the Philippines; client‑facing Teams channels not auto‑populated) are **config toggles / branches**, not code.
- **Known dependency:** IT must confirm which mailing lists / Engage groups are Graph‑accessible vs WebAdmin‑only; until then those steps degrade to prepared human actions.

---

## 13. What we've already built, and how it maps

| Built (prototype) | Role |
|---|---|
| `nodeweave` canvas + Angular binding | Visual surface for **Compose** (author) and **Operate** (live readiness map) |
| `@build744/nodeweave-angular-authoring` (catalog, palette, schema inspector, DnD) | The Compose toolkit |
| Process catalogue + graph→YAML compiler | ProcessVersion definition + the compiled spec the runtime runs |
| Branch/wait ports + labeled ports | Real gate outcomes + suspend/resume (maps to readiness states/blockers) |
| Dry‑run simulation (scenarios, animated) | Compose confidence check; seed of the live execution trace |
| Propose → preview → approve pattern | The **spine**: how AI co‑edits and how humans supervise |

**The honest gap (real engineering):** the domain + event model, **governed** persistence (readiness records + event log + classification), and the agent runtime. Strategy unchanged: build **front‑of‑house against a mock runtime** so the product is real and demoable before the plumbing exists.

---

## 14. Architecture & technology

- **Front‑of‑house (now, no backend):** Angular + nodeweave; Compose + Operate against an in‑memory **mock runtime** that plays events.
- **Source of truth (later):** governed datastore + append‑only event log; storage‑agnostic domain model; classification + retention baked in.
- **Agent runtime (later):** deterministic engine + integration adapters (Graph/mail/ticketing) + an LLM service for edge tasks; **least‑privilege connectors, environment separation, permission‑aware retrieval**. Hosting (bespoke vs Power Platform vs Copilot Studio vs hybrid) chosen against security/Graph‑permission/operability needs.
- **Stable contract:** the **compiled process spec** + the **event log** — the UI renders processes/cases/events; the runtime emits events; neither needs the other's internals.

---

## 15. Non‑goals

- Not the system of record for people, access, equipment, or tickets.
- Not an interpreter of unstructured email / intent‑guesser.
- Not a replacement for authoritative enterprise systems — we orchestrate across them.
- Not a generic workflow platform for all of PPSO (yet) — onboarding excellently first.
- No public new‑joiner portal beyond read‑only case transparency.

---

## 16. Delivery plan

- **Phase 0 — Prototype (done).** nodeweave + PPSO Compose prototype: catalogue, compiler, branch/wait, dry‑run, propose→approve.
- **Phase 1 — Definition (now).** This vision (v2); the domain + event model; the **governance/data‑classification design**; the UX of Operate (Action Inbox + live readiness view); the **structured intake contract(s)**. *Exit:* agreed shape, scope, and data‑governance posture.
- **Phase 2 — Front‑of‑house on a mock runtime.** Polished Compose (inline AI co‑editor, versioning, publish) + Operate (live readiness view + Action Inbox) for **both tracks**, driven by simulated events. *Exit:* a believable, demoable product with zero backend.
- **Phase 3 — Governed persistence & reporting.** Datastore + event log + classification/retention + native reporting.
- **Phase 4 — Agent runtime & integrations.** Deterministic engine + Graph/mail/ticketing adapters + human‑assisted actions + SLA/monitoring + LLM drafting — under the governance rules.
- **Phase 5 — Pilot & roll‑out.** 1–2 projects/batches, measure, iterate, scale.

---

## 17. Risks & open questions

- **Intake mechanism** — which approved structured sources define the contract(s) per track (forms/APIs/feeds)?
- **Data classification sign‑off** — classify the readiness record + every integration's fields before build.
- **Graph permissions** — mailing lists / Engage groups accessibility (the requirements' explicit blocker).
- **Keep/reference validation** — who actually consumes SharePoint resource lists; is Planner relied upon beyond onboarding?
- **Retrieval governance** — if we use search/embeddings, enforce permission‑aware retrieval + sensitivity metadata.
- **Runtime hosting & identity** — least‑privilege connectors, RBAC (who publishes a version; who supervises which cases), data residency.
- **Change management** — the Action Inbox must be genuinely lighter than today, not a new place to check.

---

## 18. Success metrics

- Manual coordination minutes per onboarding → near‑zero for automated steps.
- Time‑to‑ready shorter and more consistent; **cases Ready‑for‑Day‑1 on time**.
- **Readiness completion rate**, **cycle time**, **exception volume**, **blocker categories**, **cases at risk**, **duplicate rate**, **rejected‑input rate** — all visible (BRD observability).
- % steps fully automated vs agent‑assisted vs human‑only — climbing over time.
- Config/process changes ship with **zero developer tickets**.
- **Nobody opens a SharePoint list to find out what's happening.** If they still do, it isn't transformed yet.

---

## 19. Requirements traceability (Centre‑Level BRD)

| BR | Capability | Where addressed |
|---|---|---|
| BR‑01 | Structured intake | §3.2, §8.1, §9 (no‑guess), §11 (approved sources) |
| BR‑02 | Canonical readiness record | §6 (one per case, dedup) |
| BR‑03 | Completeness & quality checks | §8.3, §6 (Waiting‑for‑Info), Compose gate |
| BR‑04 | Readiness orchestration | §8.4–8.5, §6 (rule‑driven package) |
| BR‑05 | Exception management | §8.8 (Action Inbox w/ context + recommendation) |
| BR‑06 | Readiness visibility | §8.6 (live readiness view) |
| BR‑07 | Proactive intervention | §8.7 (before Day 1) |
| BR‑08 | Outcome‑based closure | §8.9, §6 (Completed gated on outcomes) |
| §4 rules | Data governance & AI design | §11 (governance pillar), §10, §14 |
| §9 NFRs | Traceability/configurability/resilience/observability/scalability | §8 (audit/events), §3.9 (no‑code), §12 (resilience), §18 (observability), §14 |

---

*Feedback welcome — meant to be argued with. Once the shape and the governance posture feel right, Phase 2 (Operate on a mock runtime) is the next build.*
