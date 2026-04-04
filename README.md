# Visual Canvas — Node Editor

A zero-dependency, browser-native visual node editor for building directed acyclic graph (DAG) pipelines. Everything is vanilla JavaScript, Web Components, and ES modules — no bundler, no transpiler, no runtime libraries.

## What it does

Visual Canvas lets users design automation pipelines by dragging nodes onto an infinite canvas, connecting them via ports, and configuring each node through a schema-driven form. The result is a portable JSON graph that can be saved, loaded, exported, and evaluated.

**Starter node types:**

| Type | Purpose | Ports |
|------|---------|-------|
| **Trigger** | Entry point — starts on event, schedule, or webhook | 1 output |
| **Action** | Runs an HTTP call, script, or email | 1 input, 1 output |
| **Logic Gate** | Branches on a condition | 1 input, 2 outputs (true / false) |
| **Data Transform** | Maps, filters, or reshapes data | 1 input, 1 output |

New node types are added declaratively through three split registries (visual, topology, schema) — no component code required.

## Architecture

```
lib/            ← reusable library (never imports from app/)
  core/         ← pure-logic domain: graph, state, commands, rule evaluator
  components/   ← Web Components: workspace, node, port, edge layer, minimap, drawer
  controllers/  ← interaction: drag, pan/zoom, selection, edge routing, keyboard
  registries/   ← node type definitions (visual, topology, schema)
  index.js      ← public API surface

app/            ← application shell that consumes lib/
  components/   ← app-shell, toolbar, component-palette, process-list
  services/     ← storage (localStorage), export (JSON download)
  styles/       ← CSS custom-property theme (light + dark)
```

### Key design rules

- **All state in one place.** `CanvasState` extends `EventTarget` and is the single source of truth. Components observe events — they never write state directly.
- **Every mutation is a Command.** `CommandHistory` gives full undo / redo. Move, add, remove, paste — all go through `execute` / `undo`.
- **Library boundary is sacred.** `lib/` knows nothing about `app/`. The app imports from `lib/index.js`.
- **No build step.** Vanilla JS shipped as `<script type="module">`. All imports use `.js` extensions.
- **Zero runtime dependencies.** Dev-only: Playwright and axe-core.

## Features

- **Infinite canvas** — pan (middle-click drag / two-finger), zoom (scroll wheel), clamped 0.1×–3×
- **Drag-and-drop** — sidebar palette → canvas, or move existing nodes with pointer capture + `requestAnimationFrame`
- **Edge routing** — drag from an output port to an input port; SVG cubic Bézier paths update live
- **Snap-to-grid** — toggle via `DragController.snapToGrid` or hold Shift mid-drag (20 px default)
- **Viewport virtualization** — nodes and edges outside the viewport are hidden (`display: none`), tested at 1 000 nodes
- **Minimap** — 200 × 140 px canvas overlay; click or drag to navigate
- **Config drawer** — schema-driven form with conditional `showIf` rules (recursive `$and` / `$or`)
- **Copy / paste / duplicate** — Ctrl+C, Ctrl+V, Ctrl+D; preserves internal edges, remaps IDs
- **Select all** — Ctrl+A
- **Undo / redo** — Ctrl+Z, Ctrl+Shift+Z
- **Delete** — Delete / Backspace removes selected nodes + connected edges
- **Save / load** — `localStorage`-backed, named pipelines
- **Export** — JSON download of the full graph
- **Dark / light theme** — CSS custom properties, `prefers-color-scheme` auto-detect, toolbar toggle
- **Accessibility** — ARIA roles, keyboard navigation, focus indicators, axe-core CI audits

## Getting started

```bash
# Install dev dependencies (Playwright only)
pnpm install

# Serve the project root (lib + app + tests)
npx serve . -l 3100

# Open the app
open http://localhost:3100/app/index.html
```

No build. No compile. Just serve and open.

## Running tests

```bash
# Unit tests (node:test, no browser needed)
node --test tests/unit/*.test.js

# Component tests (Playwright + Chromium)
pnpm exec playwright test --project=component

# End-to-end tests
pnpm exec playwright test --project=e2e

# Performance benchmarks (200 / 500 / 1 000 nodes)
pnpm exec playwright test --project=perf

# Everything
pnpm exec playwright test
```

Playwright auto-starts local servers on ports 3100 and 3000.

## Test coverage

| Suite | Tests |
|-------|------:|
| Unit (graph, state, commands, rules, culling, copy/paste, storage) | 113 |
| Component (node, edge layer, config drawer) | 19 |
| E2E (drag, pan/zoom, edge routing, undo/redo, save/load, a11y) | 24 |
| Performance (200 / 500 / 1 000 nodes) | 9 |
| **Total** | **165** |

## Project status

The project is built in phases:

1. **Domain model** — `Node`, `Port`, `Edge`, `CanvasState`, `CommandHistory`, `PipelineBuilder`
2. **Web Components** — `<canvas-workspace>`, `<canvas-node>`, `<canvas-port>`, `<canvas-edge-layer>`, `<config-drawer>`
3. **Interaction controllers** — drag, pan/zoom, selection, edge routing, keyboard
4. **Application shell** — sidebar palette, toolbar, process list, storage, export
5. **Registries & schema forms** — visual / topology / schema registries, conditional `showIf` rules
6. **Polish & performance** — minimap, viewport virtualization, snap-to-grid, copy/paste, theming, benchmarks, accessibility audit

## License

ISC
