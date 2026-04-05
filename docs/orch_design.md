## How I'd Build a Better Airflow

### Core Philosophy

**Workflows are just DAGs of functions — treat them that way.**

Airflow's fundamental mistake was making the *scheduler* the center of the universe instead of the *workflow definition*. Everything flows from that.

---

### 1. Workflow Definition: Code-First, But Not Code-Only

```python
# This is just Python. No magic globals, no module-level side effects.
from orchestrator import workflow, task

@task
def extract(source: str) -> DataFrame:
    return db.query(source)

@task
def transform(data: DataFrame) -> DataFrame:
    return data.clean()

@task
def load(data: DataFrame, target: str) -> None:
    db.write(data, target)

@workflow(schedule="0 6 * * *")
def etl_pipeline():
    raw = extract("users")
    cleaned = transform(raw)
    load(cleaned, "warehouse.users")
    
    # Native conditionals — no BranchOperator nonsense
    if cleaned.row_count > 0:
        notify("New data loaded")
```

**Key differences from Airflow:**
- DAG structure is **inferred from data dependencies**, not declared with `>>` operators
- Conditionals are native Python `if/else`, evaluated at runtime per-run
- No `execution_date` anywhere. The function receives actual parameters.
- The `@task` decorator is the *only* API surface. No Operators, no Hooks hierarchy.

---

### 2. Architecture: Separate Parse, Schedule, Execute Completely

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Definition  │────▶│   Compiler   │────▶│  Execution Plan   │
│  (Python)    │     │  (static     │     │  (immutable DAG   │
│              │     │   analysis)  │     │   snapshot + IR)  │
└─────────────┘     └──────────────┘     └──────────────────┘
                                                  │
                          ┌───────────────────────┼────────────────┐
                          ▼                       ▼                ▼
                    ┌───────────┐          ┌───────────┐    ┌───────────┐
                    │ Scheduler │          │  Worker 1  │    │ Worker N  │
                    │ (Rust)    │          │ (any lang) │    │ (any lang)│
                    └───────────┘          └───────────┘    └───────────┘
```

**Compiler** — runs once per commit/deploy, not on a loop. Produces an immutable IR (intermediate representation) of the workflow. No more "scheduler parses all DAGs every 30 seconds."

**Scheduler** — written in Rust or Go, not Python. It only reads IRs and manages scheduling decisions. Stateless, horizontally scalable. The scheduler never imports user code.

**Workers** — execute tasks via the Task SDK. Workers don't need Airflow installed. A task is a container/process that receives inputs and produces outputs. *Any language.*

---

### 3. Data Passing: First-Class, Not an Afterthought

Airflow's XCom is a hack bolted onto a metadata DB. Instead:

- **Small values** (< 1 MB): stored in the orchestrator's own object store (embedded by default, S3/GCS pluggable)
- **Large values**: tasks return *references* (URIs), the system tracks lineage automatically
- **Type-checked**: the `@task` decorator enforces input/output types at compile time
- **Streamed**: tasks can yield partial results to downstream tasks (no need to wait for full completion)

```python
@task
def generate_report(data: DataFrame) -> Artifact("s3://reports/{run_id}/report.pdf"):
    # Return type declares WHERE the output goes
    # System tracks it automatically
    ...
```

---

### 4. Dev Experience: Sub-Second Feedback

```bash
# Run a single task locally with real inputs
$ orch run etl_pipeline.extract --source="users" --local

# Run the full workflow locally (tasks execute as threads)
$ orch run etl_pipeline --local

# Run with mocked inputs
$ orch test etl_pipeline --fixture=tests/etl_fixture.yaml

# See the DAG structure without executing
$ orch inspect etl_pipeline --format=dot | dot -Tpng > dag.png
```

No webserver needed for development. No scheduler running. Tasks are just functions — test them like functions.

---

### 5. Scheduling: Time + Data + Events, Unified

```python
@workflow(
    schedule=every("6h"),
    triggers=[
        dataset("s3://bucket/raw/").modified(),
        webhook("stripe.payment.succeeded"),
    ],
    # Run when schedule fires AND at least one trigger has new data
    trigger_rule="schedule_and_any_trigger",
)
def process_payments():
    ...
```

No separate concepts for time-based, dataset-based, and event-based triggers. They compose.

---

### 6. State & Metadata: SQLite for Small, Postgres for Large, Nothing In Between

Airflow forces Postgres/MySQL even for 10 DAGs. Instead:

- **< 200 workflows**: embedded SQLite + WAL mode. Zero-config. Single binary.
- **200+ workflows**: Postgres, but with a **read-replica-aware** query layer so the UI never competes with the scheduler for DB connections.
- **Metadata is append-only**: task run results are immutable events, not mutable rows. This makes the DB trivially scalable — you can shard by time range.

---

### 7. UI: Real-Time by Default

- WebSocket-based, not polling
- DAG graph view shows **live execution state** with sub-second updates
- Log streaming is native (not "click refresh and hope")
- Built-in visual DAG editor for non-engineers (but code always wins — visual edits generate code)

---

### 8. What I'd Explicitly NOT Build

| Feature | Why not |
|---|---|
| Plugin/provider ecosystem from day one | Start with 5 solid integrations (S3, Postgres, HTTP, Slack, K8s). Quality > quantity. |
| RBAC/multi-tenancy in v1 | Ship single-tenant first. Multi-tenant is a v2 problem. |
| Custom executors | One executor: container-based. Works locally (Docker), works in prod (K8s). No Celery, no Dask, no Local. |
| REST API for everything | CLI + SDK first. REST API emerges from the SDK, not the other way around. |

---

### 9. Distribution Model

**Single binary.** Download it, run it, it works. Like SQLite but for workflow orchestration.

```bash
$ curl -fsSL https://get.orch.dev | sh
$ orch init my-project
$ orch run my_workflow --local
# That's it. No Helm chart, no docker-compose, no 12-service stack.
```

Production scaling adds components (separate scheduler, workers, Postgres) but the local experience is sacred.

---

### TL;DR

| Airflow's choice                  | My choice                                     |
| --------------------------------- | --------------------------------------------- |
| Scheduler parses Python on a loop | Compiler produces immutable IR at deploy time |
| Operators + Hooks + Connections   | Just functions with typed inputs/outputs      |
| XCom in the metadata DB           | First-class object store with type safety     |
| BranchOperator for conditionals   | Native Python `if/else` evaluated at runtime  |
| Postgres required from day one    | SQLite embedded, Postgres optional            |
| 12-service deployment             | Single binary for dev, scale-out for prod     |
| Python-only tasks                 | Any language via Task SDK (gRPC contract)     |
| Scheduler in Python               | Scheduler in Rust/Go, never imports user code |

The guiding principle: **a workflow orchestrator should be as boring as `cron` and as ergonomic as calling a function.** Everything else is accidental complexity.