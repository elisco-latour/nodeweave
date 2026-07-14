# @build744/nodeweave-core

The framework-agnostic engine behind **nodeweave** — a node/graph canvas with
Web Components, a command-pattern undo/redo history, and DAG (cycle) validation.

Use it directly (vanilla JS/Web Components) or via a framework binding such as
[`@build744/nodeweave-angular`](../angular).

## Install

```bash
pnpm add @build744/nodeweave-core
```

## Entry points

| Import | Contents |
|--------|----------|
| `@build744/nodeweave-core` | Everything (also registers the `<canvas-*>` Web Components) |
| `@build744/nodeweave-core/core` | Engine only — `CanvasState`, `Node`, `Edge`, `Port`, edge paths, culling |
| `@build744/nodeweave-core/controllers` | Interaction controllers (drag, pan/zoom, select, connect, resize, keyboard) |
| `@build744/nodeweave-core/registries` | Node-type registries (visual, topology, schema) |
| `@build744/nodeweave-core/components` | The `<canvas-*>` Web Components |

See the repository root for full documentation.
