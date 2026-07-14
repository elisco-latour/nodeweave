# @build744/core

The framework-agnostic engine behind **nodeweave** — a node/graph canvas with
Web Components, a command-pattern undo/redo history, and DAG (cycle) validation.

Use it directly (vanilla JS/Web Components) or via a framework binding such as
[`@build744/angular`](../angular).

## Install

```bash
pnpm add @build744/core
```

## Entry points

| Import | Contents |
|--------|----------|
| `@build744/core` | Everything (also registers the `<canvas-*>` Web Components) |
| `@build744/core/core` | Engine only — `CanvasState`, `Node`, `Edge`, `Port`, edge paths, culling |
| `@build744/core/controllers` | Interaction controllers (drag, pan/zoom, select, connect, resize, keyboard) |
| `@build744/core/registries` | Node-type registries (visual, topology, schema) |
| `@build744/core/components` | The `<canvas-*>` Web Components |

See the repository root for full documentation.
