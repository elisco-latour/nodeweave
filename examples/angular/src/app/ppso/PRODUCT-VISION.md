# PPSO Onboarding — Product Vision & Design

**Status:** Draft for discussion · **Owner:** Koffi Eli Kponblanou · **Audience:** PPSO team (Accenture Mauritius), stakeholders, engineering
**Date:** 2026‑07 · **Related:** requirements — *PPSO_User_Stories_Onboarding_Project_Level_v1.0.docx*; prototype — `examples/angular/src/app/ppso`

> This is a living proposal, not a spec to implement verbatim. It states the intent, the shape of the system, and the reasoning, so we can agree on *what* we're building — and what we're deliberately *not* — before we build more of it.

---

## 0. In one paragraph

Replace the fragmented, manual, SharePoint‑centric project‑onboarding process (~25–30 active projects) with a **serious, agentic system** organised around two human activities — **Compose** (design and evolve the process visually, no code) and **Operate** (run each onboarding as a supervised *Case*). An **agent does the work**; humans **supervise** through a calm, high‑signal *Action Inbox* and a **live process canvas**, not by patrolling lists. The product owns its own data and emits an **immutable event log** that is both the audit trail and the reporting substrate. M365 and specialist tools (Teams, Outlook, CDP, MyTE) become **integrations the agent feeds** — no longer the system's memory. The result eases what used to be hard and handles the complex parts programmatically, rather than porting the old process into software that behaves the same way.

---

## 1. Context & problem

Today, project‑level onboarding is coordinated by hand across ~30 projects. A lead emails/chats the PMO; the PMO manually: checks data completeness, builds a per‑project task list, updates SharePoint resource lists, drafts 4–6 access‑request emails, adds people to mailing lists / Viva Engage via WebAdmin, prepares CDP RORO, follows up on MyTE WBS access, adds Teams members, chases overdue tasks daily, and finally confirms completion. It is repetitive, error‑prone, slow, and invisible to everyone until someone asks.

The requirements captured a solid **TO‑BE**: a structured record triggers an agent that validates, reads per‑project config, creates a plan, sends notifications, and updates downstream systems. That is a real step forward. This document pushes it one level further — from *automating the current process* to *transforming it*.

---

## 2. The transformation thesis

**Engineering for business transformation is not porting an existing system into software that works the same way.** It is handling the genuinely complex parts programmatically and easing what used to be difficult. Some systems stay; some don't need to.

The clarifying moment: the PPSO team wanted SharePoint in the loop *to share onboarding data with the team and to report on it later*. That is a **crutch**, not a requirement — it recreates their filing cabinet in an automated form. Sharing and reporting are outcomes the product should provide natively; SharePoint is just where they happen to live today.

### The test to apply to every system in the stack

> *Is this a system of record that other people or tools genuinely depend on — or a crutch the PPSO adopted to hold their own data and coordinate themselves?*

| System | Role today | Verdict | In the transformed system |
|---|---|---|---|
| **SharePoint (record list, "go look at the list", reports)** | The PPSO's own data store + UI + report tool | **Replace** | The product is the source of truth; sharing = role‑aware views + push; reporting = queries over the event log |
| **SharePoint resource list a *downstream tool/team reads*** | System of record others depend on | **Keep as output** | The agent *writes* to it as an integration action (an output, not our memory) |
| **Teams** | Where people collaborate | **Keep (integration)** | Agent adds membership via Graph; notifications land here |
| **Outlook / email** | External + onshore comms | **Keep (integration)** | Agent drafts/sends; humans approve where needed |
| **Planner** | Task tracking | **Revisit** | Onboarding tracking is native (the live Case). Keep Planner only if broader teams genuinely track there; otherwise it's redundant |
| **CDP, MyTE, MMS** | External systems, some API‑less | **Keep (human‑assisted)** | Agent *prepares* the action (pre‑filled block, direct link); a human executes; the system records completion |
| **Audit list (SharePoint)** | Manual log | **Replace** | Immutable event log, automatic, per Case |

**The shift in one line:** *SharePoint moves from being the system's brain to being one of its hands.*

This test is a tool, not a verdict — the team should validate each row (especially "who actually reads the resource list?" and "does anyone rely on Planner for onboarding?").

---

## 3. Who it's for (personas & jobs)

- **Process owner (PPSO centre / a designer).** Rare, high‑stakes work. Job: *author and evolve the onboarding process without waiting for developers, and trust that a change is safe before it goes live.* → **Compose**.
- **Project PMO / Project Lead.** Frequent. Job: *start an onboarding, keep my project's config current, and handle only the few things that actually need me — fast.* → **Operate** (as supervisor + human‑in‑the‑loop actor).
- **New joiner & project team.** Job: *know where the onboarding stands and be set up on day one.* → transparency (read‑only case link, welcome/confirmation).
- **PPSO Head / leadership.** Job: *see onboarding health across projects and where the bottlenecks are.* → reporting (live, from events).

**Two‑tier authoring, confirmed:** the *process* is shared across projects; the *variation* is per‑project **configuration** (tools, contacts, channel IDs, comms template). Process owners compose the shared template; PMOs maintain config (via a form or a guided assistant) — they do not each hand‑draw a graph.

---

## 4. Product principles (the design DNA)

1. **Organise around the work, not the tool.** Modes and objects (a Case, a Process), never a CRUD app with a tab per table.
2. **The system tells you what needs you.** An Action Inbox surfaces the few decisions and human‑only steps; humans never poll a dashboard to find work.
3. **The AI acts on a visible artifact; the human supervises.** No free‑floating chatbot. AI shows up as a co‑editor of the process and as the executor of the work — always *propose → show → approve*.
4. **Deterministic where it must be, intelligent where it helps.** A rules engine runs the regulated core (gates, SLAs, audit); the LLM supplies judgment and language at the edges.
5. **Every agent action is legible, reversible, and audited.** If you can't see what it did and why, and undo it, it doesn't ship.
6. **One source of truth; integrations are outputs.** The product owns processes, cases, and events. M365/CDP/MyTE are things it writes to.
7. **No‑code evolution.** Changing a step, a contact, a template, or a rule affects the next onboarding — with no developer in the loop.
8. **Calm, focused, restrained.** Command bar over nav sprawl; one object in focus; progressive disclosure; generous space. The bar is set by the best‑designed apps of this era, not by internal admin panels.

### Explicit anti‑patterns (things we will *not* build)

- An admin panel with a left sidebar and a page per entity.
- A general chatbot bolted onto a graph editor.
- SharePoint (or any list tool) as the database.
- A BI dashboard as the operator's home screen.
- Forms‑everywhere CRUD as the primary interaction.
- An LLM free‑styling regulated actions (adding people to systems, sending external mail) without a rule or a human approving.

---

## 5. The system at a glance

Two human modes over one shared core, with the agent doing the work and integrations as outputs:

```
        Compose  ─(publish versions)─▶  One source of truth  ─(instantiate a Case)─▶  Operate
   (Process Studio,                    (processes · cases ·                        (agent executes ·
    AI co-editor,                        immutable event log)                       live case canvas ·
    dry-run)                                   ▲                                     Action Inbox)
                                               │ every action → event                      │
                                               └───────────────────────────────────────────┘
                                                                                            │ acts on / feeds
                                                                                            ▼
                                                    Integrations (Teams · Outlook · CDP · MyTE · MMS;
                                                    SharePoint resource lists = output)  +  Reporting (live, from events)
```

(See the rendered vision diagram shared alongside this document for the same picture.)

---

## 6. Core concepts (domain model)

The product is built from a small, precise vocabulary. These are the nouns everything else refers to.

- **Process** — a named onboarding orchestration (e.g. *Project onboarding*). Owns many **ProcessVersions**.
- **ProcessVersion** — an immutable, published snapshot of the flow (nodes, edges, branches, waits, SLAs, config bindings). Cases run against a specific version, so changing the process never disturbs cases already in flight. Draft → dry‑run → **publish** → (optionally) deprecate.
- **Node / Step** — a typed unit of work in a version: *trigger, gate, wait, automated action, agent‑assisted task, iterator, branch, monitor, notify*. Each carries a config schema and **variable bindings** (`{{record.*}}`, `{{config.*}}`), which is what lets one version serve all 30 projects.
- **ProjectConfig** — per‑project values (tools to provision, contacts, channel IDs, resource‑list URL, comms template variant). The single knob PMOs maintain.
- **Case** — one onboarding instance: a specific joiner, on a specific project, running a specific ProcessVersion. Has a **state** (which steps are done / running / waiting / blocked / skipped) derived from its events.
- **Event** — an immutable, timestamped fact about a Case (`validation.passed`, `plan.created`, `email.sent`, `member.added`, `task.prepared`, `task.completed`, `reminder.sent`, `escalation.raised`, `case.completed`, …). Events are the source of truth for a Case's state, the audit trail, and the reporting substrate — all three from one stream.
- **Action / Approval** — a unit of human supervision: something the agent prepared that needs a person to approve, decide, or execute (the CDP paste, the org chart, an ambiguous EID). Actions are what populate the Action Inbox.

Design consequence: a Case's live view and its audit trail are **projections of the same event log** — never a separately maintained status field that can drift.

---

## 7. Compose — the Process Studio

The visual authoring surface (built as the prototype's canvas). For process owners.

- **Author** the flow from a catalogue of step types (built): triggers, gates with real **branch ports** (valid/missing/invalid), **wait** states, automated actions, agent‑assisted tasks, monitor, confirm. Each step is configured via a **schema‑driven inspector**; values can be literals or **bindings** to record/config.
- **AI co‑editor**, done right: you describe a change in plain language ("add an Engage‑group step after Teams; only when the joiner is a lead") and it edits the *artifact you're looking at* — proposing the change as a reviewable **diff on the canvas** that you approve or reject. This is the Claude‑artifacts model, woven into the editor — **not** a chat panel off to the side.
- **Dry‑run** (built): simulate an end‑to‑end execution for a chosen scenario (EID valid / missing / invalid) — the branch is taken, the wait pauses and resumes, edges animate then settle — so you *see* the behaviour before publishing.
- **Publish** a version. Cases already running keep their version; new cases pick up the latest.
- **Compile** to a canonical, human‑readable spec (built: graph → YAML) that the runtime executes and reviewers can diff in version control.

---

## 8. Operate — the Case runtime

The heart of the transformation. For PMOs/Leads.

- **Start** an onboarding: an intake (a short guided form, or a natural‑language intake the LLM structures) creates a **Case**. Validation is a gate — missing/invalid EID never produces a half‑baked plan; the case sits in a clear *Pending* state and the right person is nudged.
- **The agent works.** It performs everything it can autonomously per the published process + project config: writes the resource list, drafts and sends access emails, adds mailing lists / Teams membership via Graph, prepares the human‑assisted tasks, sends personalised notifications, monitors SLAs, and sends the completion confirmation.
- **The live case canvas.** The same visual process, now **read‑only and lit up** with the case's real state — done, running, waiting, blocked, skipped — with each step's events and outputs inline. This is "read‑only display when being executed", and it makes the agent's behaviour legible at a glance.
- **The Action Inbox.** The operator's home. A calm queue of *only* what needs a human: an approval ("confirm owner role for this PMO joiner"), a judgment call ("EID looks deactivated — reject or chase?"), or a prepared human‑only step ("CDP RORO block ready — open CDP and paste", "org chart link"). Each item arrives *prepared* for one‑ or two‑click completion. The system chases the human, not the other way around.

Supervision model: the agent is autonomous for anything **reversible or low‑risk**, and **pauses for a human** for anything **sensitive, ambiguous, or human‑only** — a boundary defined per step type in the process, not left to chance.

---

## 9. The agent boundary (what makes it *agentic* and *safe*)

Two engines, clearly divided:

- **Deterministic orchestration engine** runs the compiled ProcessVersion: sequencing, branches, waits/resumes, SLAs, escalation policy, and audit. This is the regulated core — it must be predictable and explainable. It is *not* an LLM.
- **LLM, at the edges only**, for the things that are genuinely fuzzy:
  - **Intake:** natural language → a validated, structured record.
  - **Language:** drafting emails / Teams DMs / welcome + confirmation messages in the project's configured voice.
  - **Exceptions:** proposing a resolution when something is off (missing data, a failed write) — as a suggested Action, never an autonomous fix.
  - **Explanation & Q&A:** "where is Jane's onboarding?", "what's overdue on my projects?" — answered from the event log.
  - **Authoring assistance:** the Compose co‑editor.

**Hard rules (non‑negotiable):**
- The LLM never performs an irreversible or external action (grant access, send external mail, add to a system) without either a deterministic rule authorising it *or* explicit human approval.
- Policy (SLAs, who escalates, owner‑vs‑member, which tools) lives in **config/process**, never in a model's discretion.
- Every action — deterministic or human — emits an event and is reversible/auditable.

This is why "agentic" here is serious rather than a toy: the intelligence is real and useful, but it is bounded by a legible, deterministic spine and human command.

---

## 10. Data, events & reporting (what replaces SharePoint)

- **Source of truth:** the product's own datastore — Processes/Versions, Cases, ProjectConfig, and the **event log**.
- **Event log:** append‑only, immutable, per Case. It powers three things from one stream: the **live case state** (a projection), the **audit trail** (verbatim), and **reporting/analytics** (aggregations).
- **Reporting, natively:** time‑to‑onboard, per‑project onboarding health, SLA adherence, overdue/escalation rates, tool‑provisioning success, manual‑minutes saved — live queries, not a SharePoint export. A future analytics view can even reuse our metrics‑canvas.
- **Sharing, natively:** role‑aware read views + push notifications + shareable Case links. "The team can see it" without anyone opening a list.
- **Where data still lands in M365:** only as **integration outputs** the agent writes (e.g. a project resource list a downstream tool reads) — recorded as events, not treated as our memory.

---

## 11. Integrations

- **Microsoft Graph** for what's programmatically reachable: Teams channel membership, M365/Viva Engage groups, mailing lists (where Graph‑accessible), Outlook mail, Planner (if retained), SharePoint resource‑list writes.
- **Human‑assisted** for the API‑less/standards‑less: **CDP RORO** (prepared block + link, human pastes), **MyTE WBS** (pre‑filled, human authorises), **org chart** (link, human edits). The agent's job is to make these <2‑minute, one‑paste tasks — the "ease what was hard" promise.
- **Known dependency (from requirements):** IT must confirm which mailing lists / Engage groups are Graph‑accessible vs WebAdmin‑only. This is a real blocker to close before the runtime phase; until then those steps degrade gracefully to prepared human actions.
- **Project‑specific exceptions** (e.g. CACF's CDP handled by PMO in the Philippines; client‑facing Teams channels not auto‑populated) are modelled as **config toggles / branches**, not code.

---

## 12. What we've already built, and how it maps

| Built (prototype) | Role in the product |
|---|---|
| `nodeweave` canvas + Angular binding | The visual surface for **both** Compose (author) and Operate (live case map) |
| `@nodeweave/angular-authoring` (catalog, palette, schema inspector, DnD) | The Compose authoring toolkit |
| Process node catalogue (15 types) + graph→YAML compiler | ProcessVersion definition + the compiled spec the runtime runs |
| Branch/wait ports + labeled ports | Real gate outcomes and suspend/resume in the model |
| Dry‑run simulation (scenarios, animated) | The Compose confidence check; the seed of the real execution trace/animation |
| Propose → preview → approve pattern (copilot) | The **spine** of the whole product: how the AI co‑edits and how humans supervise execution |

**The honest gap (the real engineering):** the domain + event model, persistence (the source‑of‑truth DB), and the agent runtime. Strategy: **design these properly, then build the front‑of‑house against a mock runtime** so the product is real, demoable, and testable *before* the backend exists.

---

## 13. Architecture & technology

- **Front‑of‑house (now, no backend):** Angular + nodeweave. Compose and Operate built against an in‑memory **mock runtime** that plays events, so the full experience is real to click through.
- **Source of truth (later):** a proper datastore + append‑only event log. Technology TBD against Accenture constraints (could be a managed DB + service; the domain model is deliberately storage‑agnostic).
- **Agent runtime (later):** the deterministic engine executing compiled ProcessVersions, plus integration adapters (Graph, mail, Planner) and an LLM service for the edge tasks. Hosting is an open question (bespoke service vs Power Platform vs Copilot Studio vs hybrid) — chosen against security, Graph‑permission, and operability needs, not fashion.
- **Contract between them:** the **compiled process spec** + the **event log** are the stable interface. The UI renders processes/cases/events; the runtime produces events; neither needs to know the other's internals.

---

## 14. Non‑goals (for this iteration)

- Centre‑level (non‑project) onboarding — separate process, later.
- A generic workflow platform for all of PPSO — we solve onboarding excellently first; generality is earned, not assumed.
- Replacing Teams/Outlook/CDP/MyTE — we integrate, not rebuild.
- A public/self‑service portal for new joiners beyond a read‑only case view.

---

## 15. Delivery plan

- **Phase 0 — Prototype (done).** nodeweave library + PPSO Compose prototype: catalogue, compiler, branch/wait, dry‑run, propose→approve.
- **Phase 1 — Definition (now).** This vision doc; the domain + event model; the UX design of Operate (Action Inbox + live case view). *Exit:* agreement on shape and scope.
- **Phase 2 — Front‑of‑house on a mock runtime.** Polished Compose (inline AI co‑editor, versioning, publish) + Operate (live case canvas + Action Inbox) driven by simulated events. *Exit:* a believable, demoable product with zero backend — the thing we show the PPSO team.
- **Phase 3 — Persistence & reporting.** Real datastore + event log + native reporting. *Exit:* processes/cases/events survive and report for real.
- **Phase 4 — Agent runtime & integrations.** Deterministic engine + Graph/mail/Planner adapters + human‑assisted actions + SLA/monitoring + LLM drafting. *Exit:* a real onboarding runs end‑to‑end for one project.
- **Phase 5 — Pilot & roll‑out.** 1–2 projects, measure against the metrics below, iterate, then scale to ~30.

---

## 16. Risks & open questions

- **Graph permissions** for mailing lists / Engage groups (the requirements' explicit blocker) — resolve before Phase 4.
- **Keep/replace validation** — confirm who actually consumes SharePoint resource lists and whether Planner is relied upon beyond onboarding.
- **Identity, RBAC & approvals** — who may publish a ProcessVersion; who supervises which projects; least‑privilege for the agent's Graph access.
- **Security & data residency** — Accenture policy on where onboarding/PII data lives; the event log will contain sensitive fields (EID, dates).
- **Agent runtime hosting** — bespoke vs Power Platform vs Copilot Studio; operability, cost, and auditability trade‑offs.
- **Change management** — PMO adoption; the Action Inbox must genuinely be lighter than today, not a new place to check.
- **LLM reliability** — drafting/intake quality; guardrails and the human‑approval boundary must hold under messy real input.

---

## 17. How we know it worked (transformation, not mimicry)

- **PMO manual minutes per onboarding** drop from ~60–90 to near‑zero for automated steps (human time only on genuine judgment/human‑only tasks).
- **Time‑to‑ready** (submission → fully provisioned) measurably shorter and more consistent.
- **% of steps fully automated** vs agent‑assisted vs human‑only — and it climbs over time as integrations open up.
- **Config self‑service:** process/config changes ship with **zero developer tickets**.
- **Overdue / escalation rate** falls; nothing silently slips before a start date.
- **Nobody opens a SharePoint list to find out what's happening.** If they still do, we haven't transformed it yet.

---

*Feedback welcome — this document is meant to be argued with. The next build step (Phase 2) depends on agreeing the shape above.*
