# Phase 3 — Interaction Controllers

**Depends on:** Phase 2 (all tasks complete)

**Agents:** `interaction-engineer`, `test-engineer`

**Skills:** `interaction-controllers`, `canvas-state-management`, `accessibility`, `vanilla-js-conventions`

**Constraint:** Controllers are plain JS classes — they do NOT create DOM elements. They attach event listeners to existing elements and mutate `CanvasState` through its public API. Each controller is independently attachable and detachable.

---

## Task 3.1 — Implement `DragController` base

Create `lib/controllers/drag-controller.js`.

`DragController`:
- Constructor: `(workspace, canvasState)` where `workspace` is the `<canvas-workspace>` element
- `attach()` — binds `pointerdown` listener to the workspace (delegates to `<canvas-node>` targets)
- `detach()` — removes all listeners
- Internal state: `_isDragging`, `_draggedNodeId`, `_startX`, `_startY`, `_offsetX`, `_offsetY`

This task only sets up the class structure and attach/detach lifecycle. Actual drag logic is next.

**Agent:** `interaction-engineer`

**Acceptance:**
- `new DragController(ws, state)` creates an instance
- `attach()` / `detach()` add/remove listeners without error

---

## Task 3.2 — Implement single-node drag

Add to `DragController`:
- On `pointerdown` on a `<canvas-node>`: capture `pointerId`, record start position, set `_isDragging = true`, set `aria-grabbed="true"` on the node
- On `pointermove` (bound to `document` during drag): calculate delta from start, translate to canvas coordinates (accounting for zoom), update node position via `requestAnimationFrame` **without** going through `CommandHistory` (live preview only)
- On `pointerup`: commit a `MoveNodeCommand` to `CanvasState` (which goes through `CommandHistory`), release pointer capture, set `aria-grabbed="false"`

**Agent:** `interaction-engineer`

**Skills:** `interaction-controllers`

**Acceptance:**
- Dragging a node updates its position smoothly at 60fps
- Releasing creates a single undoable command
- `aria-grabbed` toggles correctly

---

## Task 3.3 — Implement multi-node drag

Extend `DragController`:
- If the dragged node is in `canvasState.selectedNodeIds`, drag ALL selected nodes by the same delta
- On `pointerup`, commit one `MoveNodeCommand` per moved node (or a `BatchCommand` if you implement one)

**Agent:** `interaction-engineer`

**Acceptance:**
- Selecting 3 nodes and dragging one moves all 3
- Undo after multi-drag restores all 3 positions

---

## Task 3.4 — Implement `PanZoomController` — zoom

Create `lib/controllers/pan-zoom-controller.js`.

`PanZoomController`:
- Constructor: `(workspace, canvasState)`
- `attach()` / `detach()` lifecycle
- On `wheel` event on workspace: adjust `canvasState.viewport.zoom` by delta (multiply by `0.999 ** deltaY` for smooth scaling)
- Clamp zoom to `[0.1, 3.0]`
- Update via `canvasState.setViewport()`
- Zoom towards cursor position (adjust panX/panY so the point under the cursor stays fixed)

**Agent:** `interaction-engineer`

**Acceptance:**
- Scrolling wheel zooms in/out
- Zoom is clamped at bounds
- Point under cursor stays visually fixed during zoom

---

## Task 3.5 — Implement `PanZoomController` — pan

Add panning to `PanZoomController`:
- Middle mouse button drag: `pointerdown` with `button === 1` starts pan
- Space + left-click drag: track Space keydown/keyup state, on `pointerdown` with space held, start pan
- During pan: update `canvasState.setViewport()` with delta
- On `pointerup`: stop panning
- Set `cursor: grab` / `cursor: grabbing` on workspace during pan

**Agent:** `interaction-engineer`

**Acceptance:**
- Middle-click drag pans the canvas
- Space + left-click drag pans the canvas
- Cursor changes during pan operation

---

## Task 3.6 — Implement `PanZoomController` — pinch-to-zoom

Add trackpad pinch support:
- Detect pinch via `wheel` event with `ctrlKey === true` (browser convention for trackpad pinch)
- Apply zoom logic from Task 3.4

**Agent:** `interaction-engineer`

**Acceptance:**
- Trackpad pinch gesture zooms the canvas
- Behaves identically to scroll wheel zoom

---

## Task 3.7 — Implement `SelectionController` — click selection

Create `lib/controllers/selection-controller.js`.

`SelectionController`:
- Constructor: `(workspace, canvasState)`
- `attach()` / `detach()` lifecycle
- On `pointerup` on `<canvas-node>` (where no drag occurred — delta < 3px threshold):
  - Without modifier: `canvasState.selectNode(nodeId)`
  - With Ctrl/Cmd: `canvasState.toggleNodeSelection(nodeId)`
- On `pointerup` on workspace background: `canvasState.clearSelection()`
- Selected nodes get a visual indicator (add/remove `data-selected` attribute, CSS handles the style)

**Agent:** `interaction-engineer`

**Acceptance:**
- Clicking a node selects it (deselects others)
- Ctrl+click toggles selection
- Clicking empty space deselects all
- Selected nodes visually highlighted

---

## Task 3.8 — Implement `SelectionController` — rubber-band

Add rubber-band (marquee) selection:
- On `pointerdown` on workspace background (not on a node): start rubber-band
- On `pointermove`: draw a selection rectangle (a `<div>` with dashed border, positioned absolutely)
- On `pointerup`: find all nodes whose bounding box intersects the rectangle (using `CanvasState` coordinates, not DOM measurement), call `canvasState.selectNodes(intersectingIds)`
- Remove the rubber-band element

**Agent:** `interaction-engineer`

**Acceptance:**
- Dragging on empty canvas draws a selection rectangle
- Nodes within the rectangle are selected on release
- Rectangle disappears after release

---

## Task 3.9 — Implement `EdgeRoutingController` — start phantom edge

Create `lib/controllers/edge-routing-controller.js`.

`EdgeRoutingController`:
- Constructor: `(workspace, canvasState, edgeLayer)`
- `attach()` / `detach()` lifecycle
- On `pointerdown` on `<canvas-port>` with `direction === 'out'`:
  - Store source port info
  - Create a phantom SVG `<path>` in the edge layer (dashed stroke, semi-transparent)
  - Set `_isRouting = true`

**Agent:** `interaction-engineer`

**Acceptance:**
- Clicking and holding on an output port creates a phantom SVG line
- The phantom line starts at the port's position

---

## Task 3.10 — Implement `EdgeRoutingController` — follow cursor

Add to `EdgeRoutingController`:
- On `pointermove` while `_isRouting`:
  - Translate mouse position to canvas coordinates (accounting for pan/zoom)
  - Update phantom path endpoint to cursor position
  - Highlight valid target ports (add `data-valid-target` attribute to compatible input ports)

**Agent:** `interaction-engineer`

**Acceptance:**
- Phantom line follows the cursor smoothly
- Input ports visually highlight when cursor is nearby

---

## Task 3.11 — Implement `EdgeRoutingController` — complete or cancel

Add to `EdgeRoutingController`:
- On `pointerup` over a valid `<canvas-port>` with `direction === 'in'`:
  - Create an `Edge` and call `canvasState.addEdge(edge)` (goes through `CommandHistory`)
  - Remove phantom path
  - Remove highlights
- On `pointerup` elsewhere or on Escape key:
  - Remove phantom path
  - Remove highlights
  - Cancel routing

**Agent:** `interaction-engineer`

**Acceptance:**
- Dropping on valid input port creates a real edge (undoable)
- Dropping elsewhere cancels cleanly
- Escape key cancels mid-route

---

## Task 3.12 — Implement `KeyboardController`

Create `lib/controllers/keyboard-controller.js`.

`KeyboardController`:
- Constructor: `(workspace, canvasState)`
- `attach()` / `detach()` lifecycle
- Key bindings:
  - `Tab` / `Shift+Tab` — cycle focus through `<canvas-node>` elements
  - `Arrow keys` — nudge selected node(s) by 1px (or 10px with Shift)
  - `Delete` / `Backspace` — remove selected node(s) via `canvasState.removeNode()`
  - `Ctrl+Z` / `Cmd+Z` — `canvasState.commandHistory.undo()`
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` — `canvasState.commandHistory.redo()`
  - `Escape` — clear selection, cancel any in-progress operation

**Agent:** `interaction-engineer`

**Skills:** `accessibility`

**Acceptance:**
- All keybindings work as described
- Arrow nudge creates undoable `MoveNodeCommand`
- Delete creates undoable `RemoveNodeCommand`

---

## Task 3.13 — E2E test: drag node

Create `tests/e2e/drag-drop.spec.js`.

- Load a page with `<canvas-workspace>` and a pre-built state with 2 nodes
- Simulate `pointerdown` → `pointermove` → `pointerup` on a node
- Assert node position changed in `CanvasState`
- Assert SVG edge path updated
- Trigger undo, assert node returns to original position

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/drag-drop.spec.js` — all pass

---

## Task 3.14 — E2E test: pan and zoom

Create `tests/e2e/pan-zoom.spec.js`.

- Load workspace with nodes
- Simulate `wheel` event, assert zoom changed
- Simulate middle-click drag, assert pan changed
- Assert nodes visually moved (CSS transform on viewport)

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/pan-zoom.spec.js` — all pass

---

## Task 3.15 — E2E test: edge routing

Create `tests/e2e/edge-routing.spec.js`.

- Load workspace with 2 unconnected nodes
- Simulate drag from output port of node A to input port of node B
- Assert edge exists in `CanvasState`
- Assert SVG `<path>` element created
- Simulate drag from port to empty space, assert no edge created

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/edge-routing.spec.js` — all pass

---

## Task 3.16 — E2E test: undo/redo via keyboard

Create `tests/e2e/undo-redo.spec.js`.

- Add a node, move it, add an edge
- Press Ctrl+Z three times — assert each operation reversed
- Press Ctrl+Shift+Z — assert last undo re-applied

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/undo-redo.spec.js` — all pass

---

## Task 3.17 — Update `lib/index.js`

Add new exports:
- `DragController` from `./controllers/drag-controller.js`
- `PanZoomController` from `./controllers/pan-zoom-controller.js`
- `EdgeRoutingController` from `./controllers/edge-routing-controller.js`
- `SelectionController` from `./controllers/selection-controller.js`
- `KeyboardController` from `./controllers/keyboard-controller.js`

**Agent:** `architect`

**Acceptance:**
- All controllers importable from `lib/index.js`

---

## Phase 3 Completion Checklist

- [ ] `DragController` — single and multi-node drag via `requestAnimationFrame`
- [ ] `PanZoomController` — wheel zoom, middle-click pan, space+drag pan, pinch-to-zoom
- [ ] `SelectionController` — click, Ctrl+click, rubber-band rectangle
- [ ] `EdgeRoutingController` — phantom edge, complete on valid port, cancel on escape/empty
- [ ] `KeyboardController` — Tab focus, arrow nudge, Delete, undo/redo, Escape
- [ ] All controllers have `attach()` / `detach()` lifecycle
- [ ] All E2E tests pass
- [ ] `lib/index.js` updated
