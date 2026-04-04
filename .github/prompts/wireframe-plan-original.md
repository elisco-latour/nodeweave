# Plan: Wireframe Feature Parity (Clean Break)

The library becomes consumer-agnostic. No defaults, no backwards compat — every consumer declares its DOM shape explicitly.

---

## Phase A: Library Decoupling — Required Selectors

1. **Refactor all 4 controllers to require a `selectors` object** — `DragController(workspace, state, selectors)` where `selectors = { node: '...', port: '...' }`. No defaults. `tagName` comparison → `el.matches(selector)`. `querySelectorAll('canvas-node')` → `querySelectorAll(this.#nodeSelector)`.
   - `DragController` — 4 spots
   - `SelectionController` — 4 spots + **remove `data-selected` toggling entirely** (push to consumer — controller just dispatches `selection-changed`, consumer styles its own nodes)
   - `EdgeRoutingController` — 3 spots, `selectors` becomes 4th param after `edgeLayer`
   - `KeyboardController` — 3 spots
2. **Fix `app-shell.js`** — pass `{ node: 'canvas-node', port: 'canvas-port' }` to all controllers. Add own `selection-changed` listener to toggle `data-selected` on its nodes.
3. **Fix tests** — update any fixtures/test code that instantiate controllers. Run full suite to verify.

---

## Phase B: Wireframe Port Interface (*parallel with C*)

4. **`wf-node.js`** — set `.portId`, `.direction`, `.nodeId` + `data-port` attribute on each dot element. Controllers find ports via `'[data-port]'` selector.
5. **`wf-edge-layer.js`** — add public `_getPortPosition(portId)` delegating to `#getPortCenter()`.
6. **`wf-edge-layer.js`** — add `path.phantom { stroke-dasharray: 8 4; opacity: 0.5 }` CSS for edge creation preview.

---

## Phase C: Wireframe Services (*parallel with B*)

7. **`wireframe/services/storage-service.js`** — 30-line copy, `wf-pipeline:` prefix.
8. **`wireframe/services/export-service.js`** — JSON-only export.

---

## Phase D: Wireframe UI Components (*steps 9-12 parallel*)

9. **`<wf-config-drawer>`** — schema-driven form using `RuleEvaluator`, light-theme, slide-in right. Dispatches `node-config-updated`.
10. **`<wf-toolbar>`** — Undo/Redo/Zoom/Fit/Delete. Pill-rounded. Syncs disabled state with `CommandHistory`.
11. **`<wf-palette>`** — Drag-and-drop with `dataTransfer`. Keyboard Enter → `palette-add-node`.
12. **`<wf-process-list>`** — New/Save/Load/Delete pipeline management.

---

## Phase E: Shell & Wiring (*depends on A-D*)

13. **`<wf-shell>` orchestrator** — all 5 controllers with `{ node: 'wf-node', port: '[data-port]' }`, drag-and-drop, selection→drawer, config updates, auto-save (2s), fit-to-view, controller reattach on `state-reset`. Handles `selection-changed` → sets `aria-selected` on `<wf-node>` elements.
14. **Update `wireframe/index.html`** — `<wf-shell></wf-shell>`, remove all inline script.
15. **Wire ⋮ context menu** — `wf-node` dispatches event, shell shows Duplicate/Delete floating menu.

---

## Phase F: Testing (*depends on E*)

16. Unit: wireframe storage service
17. E2E: full workflow (palette→connect→config→undo)
18. E2E: save/load

---

## What Breaks in the App Consumer (Intentionally)

- All 4 controller instantiations in `app-shell.js` must pass `{ node: 'canvas-node', port: 'canvas-port' }`
- App must add its own `selection-changed` listener to toggle `data-selected` on `<canvas-node>` elements (6 lines moved from `SelectionController` into `app-shell.js`)

---

## Duck-Type Contracts the Library Now Enforces

- **Node elements** matching `selectors.node`: must expose `.nodeId` property
- **Port elements** matching `selectors.port`: must expose `.portId`, `.direction`, `.nodeId` properties
- **Edge layer** passed to `EdgeRoutingController`: must expose `_getPortPosition(portId)` + allow `<path class="phantom">` injection into shadow SVG

---

## Dependency Graph

```
A → B+C (parallel) → D (steps parallel) → E → F
```

---

## Files Modified

### Library (breaking changes)
- `lib/controllers/drag-controller.js`
- `lib/controllers/selection-controller.js`
- `lib/controllers/edge-routing-controller.js`
- `lib/controllers/keyboard-controller.js`

### App Consumer (fix breakage)
- `app/components/app-shell.js`

### Wireframe (modify)
- `wireframe/components/wf-node.js`
- `wireframe/components/wf-edge-layer.js`
- `wireframe/index.html`

### Wireframe (create — 10 files)
- `wireframe/components/wf-shell.js`
- `wireframe/components/wf-config-drawer.js`
- `wireframe/components/wf-toolbar.js`
- `wireframe/components/wf-palette.js`
- `wireframe/components/wf-process-list.js`
- `wireframe/services/storage-service.js`
- `wireframe/services/export-service.js`
- `tests/unit/wf-storage-service.test.js`
- `tests/e2e/wf-full-workflow.spec.js`
- `tests/e2e/wf-save-load.spec.js`

---

## Excluded

- Minimap, PNG export, theme toggle, viewport culling — lighter consumer, add later if needed.
