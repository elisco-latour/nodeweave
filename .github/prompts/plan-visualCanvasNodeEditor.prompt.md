# Plan: Visual Canvas Node Editor

A zero-dependency, build-free visual node editor split into two deliverables: a **reusable ES module library** and a **web application** built on top of it.

---

## Phase 0 — Foundation *(blocks everything)*

1. Set up directory structure: `/lib/` (library), `/app/` (web app), `/tests/` (all tests)
2. Implement `CommandHistory` — undo/redo stack using the Command pattern (`execute()`, `undo()`) — this is baked in from day one, not bolted on later
3. Split the Component Registry into **3 separate registries** (fixing the SRP violation): `VisualRegistry` (colors, icons, labels), `TopologyRegistry` (input/output port definitions), `SchemaRegistry` (config form schemas + `showIf` rules)
4. Define 3–4 starter node types across all registries (e.g., `trigger`, `action`, `logic`, `data_filter`)
5. Set up Playwright (`pnpm init && pnpm add -D @playwright/test @playwright/experimental-ct-core`) + Node.js native test runner (`node --test`)
6. Create `playwright.config.js` (component testing + E2E configs)
7. Create `index.html` app shell entry point

## Phase 1 — Core DAG Engine *(domain model only, no DOM)*

*Depends on Phase 0*

7. Implement `Node` (id, type, metadata, ports Map), `Port` (id, direction in/out, nodeId, position hint), `Edge` (id, sourcePortId, targetPortId)
8. Implement `CanvasState` — the single source of truth:
   - `nodes` Map, `edges` Map, `viewport` (panX, panY, zoom), `selectedNodeIds` Set
   - `setNodePosition(id, x, y)` dispatches `'node-moved'` event — **this is the explicit coordinate notification path that replaces `ResizeObserver`**
   - Every mutation goes through `CommandHistory` (`MoveNodeCommand`, `AddNodeCommand`, `RemoveNodeCommand`, `AddEdgeCommand`, etc.)
   - `toJSON()` / `fromJSON()` for full round-trip serialization
9. Implement `PipelineBuilder` fluent API on top of `CanvasState` for programmatic graph construction
10. Unit tests: DAG integrity, cycle detection, `toJSON` round-trip, undo/redo of every command type

## Phase 2 — Web Components: Static Rendering

*Depends on Phase 1*

11. `<canvas-workspace>` — root component, `position: relative`, hosts SVG layer + node layer. ARIA `role="application"`. Exposes `.state` property accepting a `CanvasState`
12. `<canvas-node>` — `position: absolute` via `transform: translate(var(--x), var(--y))`. Subscribes to `CanvasState` `'node-moved'` events to update CSS vars. ARIA `role="button"`, `tabindex`, `aria-grabbed`
13. `<canvas-port>` — hit targets on node edges for edge attachment, `role="button"`
14. `<canvas-edge-layer>` — SVG overlay drawing cubic Bezier `<path>` elements. **Subscribes to `CanvasState` events (`node-moved`, `edge-added`, `edge-removed`), calculates endpoints from node position + port offset. No `ResizeObserver`. No DOM measurement.** `aria-hidden="true"`
15. Playwright component tests (`@playwright/experimental-ct`): mount components in isolation, verify Shadow DOM encapsulation, ARIA attributes

## Phase 3 — Interaction Controllers

*Depends on Phase 2*

16. `DragController` — `pointerdown`/`pointermove`/`pointerup` on nodes, batched via `requestAnimationFrame`, commits `MoveNodeCommand` on pointerup. Multi-select drag support
17. `PanZoomController` — wheel → zoom, Space+drag → pan, pinch-to-zoom for trackpad. Clamps zoom `[0.1, 3.0]`
18. `EdgeRoutingController` — drag from port, phantom SVG line follows cursor, drop on valid port → `AddEdgeCommand`, drop elsewhere → cancel
19. `SelectionController` — click, Ctrl+click, rubber-band rectangle selection
20. `KeyboardController` — Tab/Shift+Tab navigation between nodes, arrow keys to nudge, Delete to remove, Ctrl+Z / Ctrl+Shift+Z undo/redo, Escape to cancel
21. E2E Playwright tests: simulate full pointer event sequences, verify `CanvasState` mutations match

## Phase 4 — Schema-Driven Configuration Engine *(parallel with Phase 3)*

*Depends on Phase 2*

22. `RuleEvaluator` — recursive `_evaluateRuleTree(rule, state)` handling `$and`, `$or`, `equals`, `in`, `exists`, `notEquals`. Exhaustive unit tests
23. `<config-drawer>` — slide-out panel, `renderForm(schema, config)` generates DOM via `DocumentFragment`. Supports: string, number, select, textarea, boolean, list. Local draft state preserves hidden field data. Fires composed `'node-config-updated'` event. ARIA: form landmark, proper label associations, live regions for dynamic fields
24. Playwright component tests: form generation, conditional visibility toggling, data retention on hide/show cycle

## Phase 5 — The Web Application

*Depends on Phases 3 + 4*

25. `<app-shell>` — CSS Grid layout: sidebar | canvas | drawer
26. `<component-palette>` — reads registries, renders draggable cards. HTML5 `dragstart` on palette items → `<canvas-workspace>` handles `dragover`/`drop`, translates screen coords → canvas coords, commits `AddNodeCommand`
27. `<toolbar>` — undo/redo (disabled state bound to `CommandHistory`), zoom controls, export JSON, save
28. `StorageService` — `save`/`load`/`list` via localStorage or IndexedDB
29. `ExportService` — clean JSON export (optionally strips viewport data), download as `.json`
30. `<process-list>` — list saved processes, load, delete
31. E2E Playwright tests: full workflow — create, connect, configure, save, reload, verify round-trip

## Phase 6 — Polish & Performance

*Depends on Phase 5*

32. `<canvas-minimap>` — small overview, click to navigate
33. Viewport virtualization — skip rendering off-screen nodes
34. Performance benchmarks: 200, 500, 1000 node graphs — measure frame rate during drag/pan
35. Copy/paste nodes, snap-to-grid toggle, edge labels/selection
36. CSS custom property theming

---

## Library vs. App Boundary

| | **Library (`/lib/`)** | **App (`/app/`)** |
|---|---|---|
| **Owns** | `CanvasState`, `CommandHistory`, `RuleEvaluator`, all `<canvas-*>` web components, all controllers, all registries | `<app-shell>`, `<component-palette>`, `<toolbar>`, `<process-list>`, `StorageService`, `ExportService` |
| **Import direction** | Imports nothing from `/app/` | Imports everything from `/lib/index.js` |
| **Knows about** | Nodes, ports, edges, coordinates, schemas | Specific node type definitions, persistence, file export |
| **Ships as** | ES modules, `<script type="module">` — any project can import it | A standalone web app that demos the library |

The library is the engine. The app is one consumer. The future Tauri project is another consumer.

---

## Directory Structure

```
/lib/                              # The reusable library (zero deps)
  /lib/core/                       # Domain model, state, command history
    graph.js                       # DAG: Node, Port, Edge classes
    canvas-state.js                # Coordinates, selection, pan/zoom state
    command-history.js             # Undo/redo command stack
    rule-evaluator.js              # Recursive $and/$or AST evaluator
  /lib/components/                 # Web Components
    canvas-workspace.js            # Root <canvas-workspace> element
    canvas-node.js                 # <canvas-node> element
    canvas-edge-layer.js           # SVG overlay for edges
    canvas-port.js                 # <canvas-port> attachment points
    config-drawer.js               # <config-drawer> side panel
    minimap.js                     # Optional <canvas-minimap>
  /lib/controllers/                # Interaction logic (no DOM creation)
    drag-controller.js
    pan-zoom-controller.js
    edge-routing-controller.js
    selection-controller.js
    keyboard-controller.js         # Accessibility + shortcuts
  /lib/registries/                 # Split registries (SRP)
    visual-registry.js             # Colors, icons, labels
    topology-registry.js           # Input/output port definitions
    schema-registry.js             # Config form schemas + showIf rules
  /lib/index.js                    # Public API surface

/app/                              # The web application (imports /lib/)
  /app/components/                 # App-specific UI
    app-shell.js
    component-palette.js           # Sidebar with draggable node types
    toolbar.js                     # Save, undo, redo, zoom controls
    process-list.js                # List of saved processes
  /app/services/                   # App-level concerns
    storage-service.js             # localStorage / IndexedDB persistence
    export-service.js              # JSON export of process graph
  /app/styles/
    theme.css
  index.html                       # Entry point
  app.js                           # Bootstrap

/tests/
  /tests/unit/                     # Node.js --test runner
    graph.test.js
    canvas-state.test.js
    command-history.test.js
    rule-evaluator.test.js
  /tests/component/                # Playwright component tests (@playwright/experimental-ct)
    canvas-node.spec.js
    config-drawer.spec.js
  /tests/e2e/                      # Playwright E2E tests
    drag-drop.spec.js
    edge-routing.spec.js
    undo-redo.spec.js
    pan-zoom.spec.js
  /tests/perf/                     # Playwright performance benchmarks
    large-graph.spec.js            # 200+ nodes stress test
```

---

## Key Architectural Decisions

- **`ResizeObserver` dropped entirely** — edge positions computed from `CanvasState` coordinates + port offsets, updated via explicit `'node-moved'` events
- **Undo/redo is a first-class citizen** — `CommandHistory` exists before any UI code, every state mutation is a Command
- **Registries split 3 ways** — a node type's visual appearance, port topology, and config schema are independent concerns
- **Hidden form fields retain data** — pruning happens at export/execution time, not at UI toggle time
- **No build step** — everything runs via `<script type="module">` and native ES imports
- **No NPM packaging yet** — library is consumed via path imports; NPM publishing can be added later without architectural change

## Verification Strategy

1. `node --test tests/unit/` — graph, state, command history, rule evaluator (no browser, runs in CI)
2. `pnpm exec playwright test tests/component/` — mount individual web components via `@playwright/experimental-ct`, verify Shadow DOM + ARIA
3. `pnpm exec playwright test tests/e2e/` — full app workflows: palette → canvas → connect → configure → save → reload
4. `pnpm exec playwright test tests/perf/` — create 200+ node graph, measure drag/pan frame rate, fail if below 30fps
5. `@axe-core/playwright` integration in Playwright tests — automated accessibility audit
6. Manual: keyboard-only navigation through entire app, verify SVG edges track nodes under zoom/pan

## Out of Scope *(deliberately)*

- Tauri integration (separate project consumes the library)
- Backend API / cloud sync
- Process execution engine
- Custom scripting (Rhai/Python) inside nodes
- Collaborative editing / real-time multiplayer
- NPM packaging (can be added later, library works via ES module import)

## Open Questions

1. **Library name** — working title "FlowCanvas". Want a different name?
2. **Starter node types** — `trigger`, `action`, `logic_gate`, `data_transform` as the initial 4. Adequate?
3. **Persistence backend** — localStorage for simplicity, or IndexedDB for larger storage?
