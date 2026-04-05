# Plan: Orch — Full Workflow Orchestrator

Build "Orch" as a separate repo. Go scheduler (single binary), Python Task SDK, Visual Canvas as the embedded DAG editor. 6 phases, each independently shippable.

---

## Phase 1: Core Data Model & Python Task SDK

1. **Design the Workflow IR schema** (JSON) — task definitions, edges, schedule, retry policy, types, version field
2. **Build Python Task SDK** (`orch-sdk` package) — `@task` and `@workflow` decorators with type enforcement, `Artifact` type for output locations. No runtime yet, just decoration + introspection.
3. **Build the Compiler** — walk `@workflow` function body via `ast` module, infer DAG from data dependencies, resolve `if/else` as conditional nodes, cycle detection, produce immutable IR JSON

## Phase 2: Local Runner & CLI

4. **Local Runner** — reads IR, topological sort, execute tasks as threads/subprocesses, in-memory data passing, conditional branch eval, retry logic, live console status
5. **CLI** (`orch` command via Click/Typer) — `init`, `compile`, `run --local`, `test --fixture`, `inspect --format=json|dot|text`. **French + English from day one.**
6. **Object Store** — local FS default (`.orch/artifacts/`), immutable outputs, pluggable backend interface for S3/GCS later

## Phase 3: Visual Editor Integration

7. **Orchestrator node type registries** — scan `@task` functions, populate Visual Canvas's `VisualRegistry`, `TopologyRegistry`, `SchemaRegistry` automatically (*parallel with step 8*)
8. **Codegen bridge** (JS) — `CanvasState.toJSON()` → Python `@workflow` source code via templates
9. **Parse bridge** (Python) — existing `@workflow` file → `CanvasState`-compatible JSON + auto-layout. Enables round-trip: code → visual → code
10. **Editor app** (vanilla JS) — new `editor/` dir, imports Visual Canvas via submodule/symlink. `<orch-shell>`, `<orch-palette>`, `<orch-toolbar>` with compile/run/export buttons. Live execution overlay (color nodes as tasks complete)

## Phase 4: Distributed Runtime (Go Scheduler + Workers)

11. **gRPC contract** — `SubmitTask`, `ReportResult`, `Heartbeat`, `RegisterWorker` in `.proto` files
12. **Scheduler** (Go, single binary) — reads IRs, cron/event trigger eval, task queue, worker assignment, gRPC server, HTTP API, **embedded SQLite** (pure Go, no CGo)
13. **Python Worker** — gRPC client, subprocess isolation per task, streams logs, auto-reconnect
14. **Event system** — webhook receiver on scheduler, file/S3 polling for dataset triggers. No Kafka/Redis.

## Phase 5: Web Dashboard

15. **Dashboard API** (Go, part of scheduler binary) — REST + WebSocket. Workflow list, run status, streaming logs, manual trigger, API key auth
16. **Dashboard UI** (vanilla JS) — embeds Visual Canvas for live DAG view. Nodes colored by status (gray/blue/green/red). Log panel, run list, manual trigger. French + English toggle.
17. **Single binary packaging** — `//go:embed` static files into scheduler. `orch serve` = scheduler + dashboard + worker all-in-one.

## Phase 6: Production Hardening

18. **Postgres backend** — migration from SQLite, read-replica awareness, append-only event tables (*parallel with 19*)
19. **Offline resilience** — worker queues locally if scheduler unreachable, syncs on reconnect
20. **i18n completion** — all CLI, dashboard, error messages, docs in fr + en
21. **Packaging** — Go binaries (linux/darwin, amd64/arm64), Docker image, `pip install orch-sdk`, `curl | sh` installer, systemd service file
22. **Documentation** — quickstart (fr + en), SDK reference, IR spec, deployment guide, editor user guide

---

## Architecture

```
Developer: @task Python → Compiler → IR JSON → Local Runner
           Visual Editor → Codegen → Python → Compiler → IR

Production: Scheduler (Go binary, SQLite/Postgres)
            ├── gRPC → Worker 1 (Python)
            ├── gRPC → Worker N (any lang)
            └── HTTP/WS → Dashboard (embedded)
```

## Tech Stack

| Component | Language | Key Deps |
|---|---|---|
| Task SDK + Compiler | Python 3.11+ | stdlib only (`ast`, `concurrent.futures`) |
| CLI | Python | `click` or `typer` |
| Scheduler | Go | `modernc.org/sqlite`, `grpc-go`, `robfig/cron` |
| Worker | Python | `grpcio` |
| Editor + Dashboard | Vanilla JS | Visual Canvas (submodule) |

## Key Decisions

- **Go over Rust** for scheduler — easier to hire for, faster to build, gRPC is native, single binary is trivial
- **No Celery, no Redis, no Kafka** — gRPC direct, SQLite for state. Minimal infra requirements.
- **SQLite default** — critical for single-binary story and low-resource servers
- **Visual Canvas as git submodule** — stays standalone, editor symlinks to `lib/`
- **French + English from Phase 2** — not bolted on later

## Parallel Tracks

- Phase 1 (SDK) ∥ Phase 3 steps 7-8 (registry mapping, codegen)
- Phase 4 (Go scheduler) can start once IR spec freezes (end of Phase 1)
- Phase 5 (dashboard) can start once scheduler HTTP API exists (mid Phase 4)
- Phase 6 items are independent of each other

## Repo Structure (proposed)

```
orch/
├── cmd/                    # Go CLI entrypoints
│   ├── orch-scheduler/     # main.go for scheduler binary
│   └── orch-worker/        # (optional) standalone Go worker
├── internal/               # Go internal packages
│   ├── scheduler/          # Scheduling engine
│   ├── store/              # SQLite + Postgres abstraction
│   ├── grpc/               # Proto definitions + server
│   └── dashboard/          # HTTP handlers + WebSocket
├── sdk/                    # Python Task SDK (pip-installable)
│   ├── orch/
│   │   ├── __init__.py
│   │   ├── task.py         # @task decorator
│   │   ├── workflow.py     # @workflow decorator
│   │   ├── compiler.py     # AST → IR
│   │   ├── runner.py       # Local runner
│   │   └── artifacts.py    # Object store
│   └── pyproject.toml
├── cli/                    # Python CLI (wraps SDK)
│   └── orch_cli/
├── editor/                 # Visual editor (vanilla JS)
│   ├── index.html
│   ├── components/
│   ├── services/
│   └── lib/ → symlink to visual-canvas/lib/
├── dashboard/              # Dashboard UI (vanilla JS)
│   ├── index.html
│   └── components/
├── proto/                  # gRPC .proto files
├── docs/                   # Documentation (fr + en)
├── examples/               # Example workflows
└── tests/
    ├── sdk/                # Python SDK tests
    ├── scheduler/          # Go scheduler tests
    └── e2e/                # Full integration tests
```
