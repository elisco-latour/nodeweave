# Phase 2 — Web Components: Static Rendering

**Depends on:** Phase 1 (all tasks complete)

**Agents:** `component-engineer`, `test-engineer`

**Skills:** `web-components`, `svg-edge-rendering`, `accessibility`, `vanilla-js-conventions`

**Constraint:** Components subscribe to `CanvasState` events for updates. No `ResizeObserver` usage. No direct DOM measurement for edge positioning — positions come from `CanvasState` coordinates + port offsets.

---

## Task 2.1 — Implement `<canvas-workspace>` shell

Create `lib/components/canvas-workspace.js`.

`<canvas-workspace>` (extends `HTMLElement`):
- Registers as custom element `'canvas-workspace'`
- Creates Shadow DOM with:
  - A `<style>` block (`:host { display: block; position: relative; overflow: hidden; width: 100%; height: 100%; }`)
  - An inner `<div class="viewport">` that receives CSS `transform: translate(var(--pan-x), var(--pan-y)) scale(var(--zoom))`
  - A `<slot>` inside the viewport for child elements
- Exposes a `state` property setter that accepts a `CanvasState` instance
- When `state` is set, listens to `'viewport-changed'` and updates `--pan-x`, `--pan-y`, `--zoom` CSS variables

This task does NOT render nodes or edges — it only sets up the container and viewport transform.

**Agent:** `component-engineer`

**Acceptance:**
- `document.createElement('canvas-workspace')` creates a valid element
- Setting `.state` wires up viewport event listener
- Changing viewport on state updates CSS transform variables

---

## Task 2.2 — ARIA setup for `<canvas-workspace>`

Add to the `<canvas-workspace>` Shadow DOM:
- `role="application"` on the host
- `aria-label="Visual canvas editor"`
- `aria-roledescription="canvas"`

**Agent:** `component-engineer`

**Skills:** `accessibility`

**Acceptance:**
- `getAttribute('role')` returns `'application'`
- `aria-label` and `aria-roledescription` are present

---

## Task 2.3 — Implement `<canvas-node>` structure

Create `lib/components/canvas-node.js`.

`<canvas-node>` (extends `HTMLElement`):
- Registers as custom element `'canvas-node'`
- Shadow DOM with:
  - `<style>`: `:host { position: absolute; transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px)); }` plus base styling (background, border-radius, padding, min-width)
  - A `<div class="header">` with a colored bar (color from `VisualRegistry`)
  - A `<div class="label">` showing the node name
  - A `<div class="ports ports-in">` container (left side)
  - A `<div class="ports ports-out">` container (right side)
- Exposes properties: `nodeId`, `nodeType`, `label`
- Exposes method: `setPosition(x, y)` — updates `--x` and `--y` CSS variables

This task does NOT handle events — it only renders the static visual.

**Agent:** `component-engineer`

**Skills:** `web-components`

**Acceptance:**
- Element renders with label and colored header
- `setPosition(100, 200)` visually moves the element

---

## Task 2.4 — ARIA attributes for `<canvas-node>`

Add to `<canvas-node>`:
- `role="button"` on the host
- `tabindex="0"`
- `aria-label` dynamically set to the node's label
- `aria-grabbed="false"` (will be toggled by DragController in Phase 3)
- `aria-roledescription="graph node"`

**Agent:** `component-engineer`

**Skills:** `accessibility`

**Acceptance:**
- Node is focusable via Tab
- Screen reader announces node label and role

---

## Task 2.5 — Wire `<canvas-node>` to `CanvasState`

Add state binding to `<canvas-node>`:
- Expose a `state` property setter (receives the `CanvasState` instance)
- When set, subscribe to `'node-moved'` events — if the event's `nodeId` matches this node, call `setPosition(x, y)`
- On `disconnectedCallback`, unsubscribe from events

**Agent:** `component-engineer`

**Skills:** `canvas-state-management`

**Acceptance:**
- Calling `state.setNodePosition(nodeId, 300, 400)` causes the matching `<canvas-node>` to visually move
- Disconnecting the element cleans up the event listener

---

## Task 2.6 — Implement `<canvas-port>`

Create `lib/components/canvas-port.js`.

`<canvas-port>` (extends `HTMLElement`):
- Registers as custom element `'canvas-port'`
- Shadow DOM with:
  - Small circle/dot (8–12px) styled as a connection point
  - Color changes on `:hover`
- Exposes properties: `portId`, `direction` (`'in'` | `'out'`), `nodeId`
- `role="button"`, `tabindex="0"`, `aria-label` set to port label

**Agent:** `component-engineer`

**Acceptance:**
- Port renders as a small interactive dot
- Hover state visually distinguishable
- Accessible via keyboard

---

## Task 2.7 — Render ports inside `<canvas-node>`

Update `<canvas-node>` to:
- Accept a `ports` property (array of `Port` objects from the domain model)
- On set, create `<canvas-port>` elements and append them to the appropriate container (`ports-in` or `ports-out`)
- Clear and re-render if ports change

**Agent:** `component-engineer`

**Acceptance:**
- Setting `ports` renders the correct number of `<canvas-port>` children
- Input ports appear on the left, output ports on the right

---

## Task 2.8 — Implement `<canvas-edge-layer>` SVG overlay

Create `lib/components/canvas-edge-layer.js`.

`<canvas-edge-layer>` (extends `HTMLElement`):
- Registers as custom element `'canvas-edge-layer'`
- Shadow DOM with:
  - An `<svg>` element, `width="100%"` `height="100%"`, `position: absolute; top: 0; left: 0; pointer-events: none;`
  - `aria-hidden="true"` on the SVG (edges described via node relationships, not visually)
- Exposes a `state` property setter (receives `CanvasState`)
- Internal method `_getPortPosition(portId)` — looks up the port's parent node position from `CanvasState`, adds port offset based on direction and index. Returns `{ x, y }`.

This task creates the SVG container and position calculation. Drawing paths is the next task.

**Agent:** `component-engineer`

**Skills:** `svg-edge-rendering`

**Acceptance:**
- SVG overlay fills the workspace
- `_getPortPosition()` returns correct coordinates based on node position + port offset
- No `getBoundingClientRect()` calls — positions come from `CanvasState` data

---

## Task 2.9 — Draw SVG Bezier paths for edges

Add to `<canvas-edge-layer>`:
- Method `_renderEdge(edge)` — creates an SVG `<path>` element with a cubic Bezier curve from source port to target port
- Bezier control points: horizontal offset of ~40% of the distance between source and target X
- Method `_renderAllEdges()` — clears all paths, iterates `state.edges`, calls `_renderEdge` for each
- On `state` set, call `_renderAllEdges()` and subscribe to:
  - `'edge-added'` → add the new path
  - `'edge-removed'` → remove the path
  - `'node-moved'` → recalculate paths for edges connected to the moved node

**Agent:** `component-engineer`

**Skills:** `svg-edge-rendering`

**Acceptance:**
- Edges render as smooth cubic Bezier curves
- Moving a node (via `CanvasState`) causes connected edges to update in real-time
- Adding/removing edges dynamically creates/destroys SVG paths

---

## Task 2.10 — Integrate components in `<canvas-workspace>`

Update `<canvas-workspace>` to:
- When `state` is set, create a `<canvas-edge-layer>` and append it to the viewport
- Iterate `state.nodes`, create `<canvas-node>` for each, set its properties, append to viewport
- Subscribe to `'node-added'` — create and append new `<canvas-node>`
- Subscribe to `'node-removed'` — find and remove the corresponding `<canvas-node>`
- Pass `state` to each `<canvas-node>` and to the `<canvas-edge-layer>`

**Agent:** `component-engineer`

**Acceptance:**
- Setting `state` on `<canvas-workspace>` renders all nodes and edges
- Adding a node to state dynamically creates its visual representation
- Removing a node removes it from the DOM

---

## Task 2.11 — Playwright component test: `<canvas-node>`

Create `tests/component/canvas-node.spec.js`.

Using `@playwright/experimental-ct`:
- Mount `<canvas-node>` with label and ports
- Assert Shadow DOM contains header, label, and port elements
- Assert ARIA attributes (`role`, `tabindex`, `aria-label`)
- Call `setPosition(150, 250)` and verify CSS variable values
- Verify port count matches input

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/component/canvas-node.spec.js` — all pass

---

## Task 2.12 — Playwright component test: `<canvas-edge-layer>`

Create `tests/component/canvas-edge-layer.spec.js`.

Mount `<canvas-edge-layer>` with a pre-built `CanvasState` containing 3 nodes and 2 edges:
- Assert 2 SVG `<path>` elements exist
- Mutate a node position via `state.setNodePosition()`, assert path `d` attribute changed
- Add a new edge via `state.addEdge()`, assert 3 paths now exist
- Remove an edge via `state.removeEdge()`, assert 2 paths remain

**Agent:** `test-engineer`

**Skills:** `playwright-testing`, `svg-edge-rendering`

**Acceptance:**
- `pnpm exec playwright test tests/component/canvas-edge-layer.spec.js` — all pass

---

## Task 2.13 — Update `lib/index.js`

Add new exports:
- `'./components/canvas-workspace.js'` (side-effect import to register the element)
- `'./components/canvas-node.js'`
- `'./components/canvas-port.js'`
- `'./components/canvas-edge-layer.js'`

**Agent:** `architect`

**Acceptance:**
- Importing `lib/index.js` registers all custom elements

---

## Phase 2 Completion Checklist

- [ ] `<canvas-workspace>` renders viewport with pan/zoom CSS transform
- [ ] `<canvas-node>` renders label, header color, ports, positioned via CSS vars
- [ ] `<canvas-port>` renders interactive connection points
- [ ] `<canvas-edge-layer>` draws SVG Bezier curves from `CanvasState` data
- [ ] All components subscribe to `CanvasState` events (no `ResizeObserver`)
- [ ] Edge positions update when nodes move
- [ ] ARIA roles on all interactive elements
- [ ] Component tests pass
- [ ] `lib/index.js` updated
