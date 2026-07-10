# Plan: Reaching ReactFlow Parity (Angular-targeted)

## Context

visual-canvas is a zero-dependency Vanilla JS graph/canvas library built on Web Components and custom
controllers. Two examples (`app/`, `wireframe/`) prove the architecture works. The goal is to reach
the same level of flexibility, documentation, and extensibility as ReactFlow — but targeting the
Angular ecosystem instead of React.

---

## Gap Analysis vs ReactFlow

### API & Developer Experience
| Gap | Current state | Target |
|-----|--------------|--------|
| Unified public API | Exposed by `lib/index.js` but no clear "what's public" contract | Explicit public API surface + deprecation policy |
| TypeScript types | `lib/types/` has some `.d.ts` | Full ambient declarations for all public symbols |
| Schema format inconsistency | `lib/` uses object, `wireframe/` uses array; adapters needed | One canonical format (object keyed by field id) |
| Selector contract | Manual `{ node: '...', port: '...' }` is brittle | Auto-discovery or typed config object |
| Callbacks / hooks | Only EventTarget events | `onConnect`, `onNodeDrag`, `onNodeDragStop`, `onEdgeUpdate` options object |
| Connection validation | Only cycle detection (hardcoded) | User-supplied `isValidConnection(sourcePort, targetPort) => boolean` |

### Missing Visual Features
| Feature | Status |
|---------|--------|
| Custom edge types (straight, step, smoothstep) | Only cubic Bézier exists |
| Edge labels | Not implemented |
| Edge markers (arrowheads) | Not implemented |
| Animated edges (marching-ants / dash-offset) | Not implemented |
| Node resize handles | Not implemented |
| Node grouping / sub-flows | Not implemented |
| Background component (standalone) | Only in wireframe app CSS |
| Controls component (standalone) | Only in wireframe toolbar |

### Angular Integration (the main gap)
| Concern | Status |
|---------|--------|
| Angular service wrapping CanvasState | Not exists |
| Angular standalone component | Not exists |
| Custom node via ng-template | Not exists |
| Signal bridge (primary) / Observable (fallback) | Not exists |
| NgModule / standalone export | Not exists |

### Documentation
| Concern | Status |
|---------|--------|
| API reference | Only JSDoc comments |
| Getting-started guide | Partial `docs/usage-guide.md` |
| Custom node/edge authoring guide | Not exists |
| Angular integration guide | Not exists |

---

## Recommended Approach: 4 Phases

### Phase 1 — Port `lib/` to TypeScript + Solidify Core API
**Goal:** Convert the library source to TypeScript (`.ts` files compiled to `.js`), making types
first-class and the public API explicit and consistent. This replaces the hand-written `.d.ts` files
and removes all the current schema format inconsistencies.

**Why port to TS now rather than later:** the Angular integration package will be TypeScript natively.
Wrapping a JS lib from TS is painful (ambient types drift). Porting the lib first means Angular
consumers get full IntelliSense, strict null checks, and correct generics out of the box.

1. **Convert `lib/` to TypeScript** — rename all `lib/**/*.js` → `.ts`, add strict types.
   - `tsconfig.json` already exists; adjust `include` to `lib/**/*.ts`.
   - Build output goes to `dist/` (compiled `.js` + `.d.ts`). Examples (`app/`, `wireframe/`)
     import from `dist/` (or a dev server that serves compiled output).
   - Private class fields (`#foo`) stay as `private` TypeScript fields — same semantics, better
     tooling support.

2. **Canonical schema format** — standardize on `Record<string, SchemaField>` (object keyed by id).
   - Port `wireframe/registries.js` → `wireframe/registries.ts` using object format.
   - Remove the `Array.isArray` adapter from `wf-config-drawer`.

3. **Typed `ControllerOptions`** — replace raw `SELECTORS` with a typed options object:
   ```ts
   interface ControllerOptions {
     nodeSelector: string;
     portSelector: string;
     snapGrid?: [number, number];
     onConnect?: (sourcePortId: string, targetPortId: string) => void;
     isValidConnection?: (sourcePortId: string, targetPortId: string) => boolean;
     onNodeDrag?: (nodeId: string, x: number, y: number) => void;
     onNodeDragStop?: (nodeId: string, x: number, y: number) => void;
   }
   ```
   Files: `lib/controllers/*.ts` (all five).

4. **Typed `CanvasStateOptions`** — constructor options on `CanvasState`:
   ```ts
   new CanvasState({ onConnect, isValidConnection, onNodesChange, onEdgesChange })
   ```
   File: `lib/core/canvas-state.ts`.

5. **Stable `package.json` exports** pointing to compiled `dist/`:
   ```json
   "exports": {
     ".": "./dist/index.js",
     "./core": "./dist/core.js",
     "./controllers": "./dist/controllers.js",
     "./registries": "./dist/registries.js",
     "./components": "./dist/components.js"
   }
   ```

---

### Phase 2 — Missing Visual Features
Implement in this order (each is independent):

**2a. Edge types** — Add `type` property to `Edge` (`'bezier'|'straight'|'step'|'smoothstep'`).
- `lib/core/graph.js` — add `type` field to `Edge`, default `'bezier'`.
- `lib/components/canvas-edge-layer.js` and `wireframe/components/wf-edge-layer.js` — dispatch to
  `_pathForType(type, src, tgt)` which calls the appropriate path builder.

**2b. Edge markers** — SVG `<defs>` with `<marker>` elements (arrowhead). Each edge path gets
`marker-end` attribute.
- Files: edge layer components.
- Controlled by `Edge.markerEnd` property (`'arrow'|'arrowclosed'|null`).

**2c. Edge labels** — Midpoint `<foreignObject>` (or `<text>`) on SVG overlay.
- Files: edge layer components.
- `Edge.label?: string`.

**2d. Animated edges** — CSS animation on `stroke-dashoffset` for edges with `Edge.animated = true`.
- Files: edge layer components (add CSS keyframe + class toggle).

**2e. Node resize** — `ResizeController` (new file `lib/controllers/resize-controller.js`).
- 8-handle resize using pointer capture, fires `node-resized` on CanvasState.
- `lib/core/canvas-state.js` — add `ResizeNodeCommand`.

**2f. Standalone Background component** — extract wireframe's dot-grid CSS into
`lib/components/canvas-background.js` (`<canvas-background type="dots|lines|cross" gap color>`).

**2g. Standalone Controls component** — extract toolbar into
`lib/components/canvas-controls.js` (`<canvas-controls>` with slot for custom buttons, wires to state).

---

### Phase 3 — Angular Integration Package
Create `packages/angular/` (or `angular/`) — a thin Angular wrapper over the lib.

**3a. `VisualCanvasService`** (Angular `@Injectable`)
- Wraps `CanvasState` and the three registries.
- Exposes state as Angular **Signals** (primary): `nodes = signal<Node[]>([])`, `edges = signal<Edge[]>([])`, `selectedIds = signal<Set<string>>(new Set())`, `viewport = signal(...)`.
- Bridges from `CanvasState` EventTarget events → signal updates via `effect()` / `toSignal()`.
- `Observable` adapters (`nodes$`, `edges$`) provided only as `toObservable(this.nodes)` secondary exports for teams not yet on Signals.
- All mutating methods delegate to `CanvasState` (no duplicate logic).

**3b. `<visual-canvas>` Angular standalone component**
- Hosts the Web Component `<canvas-workspace>` (or equivalent) inside its template.
- `@Input()` bindings: `nodes`, `edges`, `nodeTypes`, `edgeTypes`, `snapToGrid`, `fitViewOnInit`.
- `@Output()` EventEmitter: `onConnect`, `onNodeDrag`, `onNodesChange`, `onEdgesChange`.
- Attaches all controllers in `ngAfterViewInit`, detaches in `ngOnDestroy`.

**3c. Custom node template support**
- `@Input() nodeTypes: Record<string, Type<any>>` — maps node type strings to Angular components.
- Angular CDK Portal or `ViewContainerRef` to project Angular components into Shadow DOM slots.
- Alternative: `ng-template` with `NgTemplateOutlet` for simpler cases.

**3d. `VisualCanvasModule` + standalone exports**
- `VisualCanvasModule` for NgModule users.
- `VISUAL_CANVAS_STANDALONE` array for standalone component users.

**3e. Angular-specific example** — `examples/angular/` with an Angular CLI app demonstrating the
wrapper in a real Angular 17+ standalone component setup.

---

### Phase 4 — Documentation
Using the ReactFlow docs structure as a model:

1. **API Reference** (auto-generated from JSDoc via TypeDoc or manually):
   - `CanvasState` — constructor options, methods, events.
   - `Node`, `Edge`, `Port` — properties.
   - `Registry` + subclasses — methods.
   - All five controllers — constructor, options, `attach()`, `detach()`.
   - All Web Components — attributes, CSS variables, slots.

2. **Guides:**
   - Getting started (plain HTML, no framework)
   - Getting started with Angular
   - Custom node types
   - Custom edge types
   - Layout algorithms (manual + PipelineBuilder)
   - Theming with CSS custom properties
   - Export (JSON, PNG)
   - Accessibility

3. **Migration guide** — for anyone moving from plain `app/` pattern to Angular package.

---

## Verification for Each Phase

- **Phase 1:** `app/` and `wireframe/` examples still work after migrating imports to `dist/`. TypeScript
  `tsc --noEmit` passes with zero errors. Unit tests in `tests/unit/` all green.
- **Phase 2:** Each feature has a dedicated Playwright E2E test or visual snapshot.
- **Phase 3:** Angular example app compiles (`ng build`), runs, and all controller interactions
  work (drag, connect, undo/redo, keyboard shortcuts).
- **Phase 4:** TypeDoc generates without errors. All code snippets in guides are runnable.

---

## Recommended Starting Point

**Start with Phase 1** — no new features ship cleanly onto a shaky API. Once the contract is
explicit, Phases 2 and 3 can run in parallel (edge types are pure lib work; Angular wrapper is
a separate package).

The Angular integration is Phase 3 because it depends on a stable, typed public API from Phase 1,
and benefits from the richer feature set of Phase 2.