# @nodeweave/core

The framework-agnostic engine behind **nodeweave** — a node/graph canvas with
Web Components, a command-pattern undo/redo history, and DAG (cycle) validation.

Use it directly (vanilla JS/Web Components) or via a framework binding such as
[`@nodeweave/angular`](../angular).

## Install

```bash
pnpm add @nodeweave/core
```

## Entry points

| Import | Contents |
|--------|----------|
| `@nodeweave/core` | Everything (also registers the `<canvas-*>` Web Components) |
| `@nodeweave/core/core` | Engine only — `CanvasState`, `Node`, `Edge`, `Port`, edge paths, culling |
| `@nodeweave/core/controllers` | Interaction controllers (drag, pan/zoom, select, connect, resize, keyboard) |
| `@nodeweave/core/registries` | Node-type registries (visual, topology, schema) |
| `@nodeweave/core/components` | The `<canvas-*>` Web Components |

See the repository root for full documentation.
