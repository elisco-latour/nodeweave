# Phase 6 — Polish & Performance

**Depends on:** Phase 5

**Agents:** `component-engineer`, `interaction-engineer`, `test-engineer`, `architect`

**Skills:** `web-components`, `canvas-state-management`, `svg-edge-rendering`, `accessibility`, `playwright-testing`

---

## Task 6.1 — Implement `<canvas-minimap>` — shell

Create `lib/components/canvas-minimap.js`.

`<canvas-minimap>` (extends `HTMLElement`):
- Shadow DOM with an `<canvas>` element (HTML Canvas 2D)
- Fixed size: 200×140px, positioned bottom-left via CSS
- `role="img"`, `aria-label="Pipeline overview minimap"`
- Properties: `canvasState`, `viewportTransform`
- Method: `render()` — called on `'node-added'`, `'node-removed'`, `'node-moved'`, `'viewport-changed'` events

**Agent:** `component-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- Element renders a small canvas overlay
- ARIA attributes present

---

## Task 6.2 — Implement `<canvas-minimap>` — node rendering

Implement `render()`:
- Clear canvas
- Compute bounding box of all nodes in `CanvasState`
- Scale all node positions to fit within the 200×140 minimap
- Draw each node as a small filled rectangle (color from `VisualRegistry`)
- Draw edges as simple lines (not Bezier — keep it cheap)

**Agent:** `component-engineer`

**Acceptance:**
- Minimap shows correct relative positions of all nodes
- Colors match node types
- Edges shown as straight lines

---

## Task 6.3 — Implement `<canvas-minimap>` — viewport indicator

Extend `render()`:
- Draw a semi-transparent rectangle representing the current viewport bounds
- Viewport bounds derived from the workspace's pan/zoom transform
- Pointer events on minimap:
  - Click: set viewport center to clicked position (converted to canvas coordinates)
  - Drag: pan viewport by dragging the viewport indicator

**Agent:** `component-engineer` + `interaction-engineer`

**Acceptance:**
- Blue rectangle shows current viewport area
- Clicking minimap pans the main canvas
- Dragging viewport indicator pans smoothly

---

## Task 6.4 — Implement viewport virtualization — occlusion check

Create `lib/core/viewport-culling.js`.

`ViewportCulling`:
- Static method `getVisibleNodes(canvasState, viewportBounds)`:
  - Returns array of node IDs whose bounding box intersects the viewport
  - Bounding box: `{ x: node.x, y: node.y, width: node.width, height: node.height }`
  - Viewport bounds: `{ x, y, width, height }` in canvas coordinates
- Uses simple AABB intersection test

**Agent:** `domain-engineer`

**Acceptance:**
- Nodes fully outside viewport excluded
- Nodes partially overlapping viewport included
- Empty canvas returns empty array

---

## Task 6.5 — Unit tests for `ViewportCulling`

Create `tests/unit/viewport-culling.test.js`.

Test cases:
- Node fully inside viewport — included
- Node fully outside (left, right, above, below) — excluded
- Node partially overlapping each edge — included
- Node larger than viewport (covers it) — included
- Zero nodes — empty result
- All nodes visible — all returned

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/viewport-culling.test.js` — all pass

---

## Task 6.6 — Wire viewport virtualization to `<canvas-workspace>`

Modify `<canvas-workspace>`:
- On `'viewport-changed'` and `'node-added'` / `'node-removed'` / `'node-moved'`:
  - Call `ViewportCulling.getVisibleNodes()`
  - Set `display: none` on `<canvas-node>` elements not in visible set
  - Set `display: ''` on those in visible set
- Ensure edge layer only renders edges connected to at least one visible node

**Agent:** `component-engineer`

**Skills:** `canvas-state-management`

**Acceptance:**
- Scrolling away from nodes hides their DOM elements
- Scrolling back reveals them
- Performance: 500 nodes with only 20 visible renders at 60fps

---

## Task 6.7 — Implement snap-to-grid

Add to `DragController`:
- Optional `snapToGrid` property (default: `false`)
- `gridSize` property (default: 20)
- When `snapToGrid` is true, round final `x`/`y` to nearest `gridSize` multiple before creating `MoveNodeCommand`
- Toggle via keyboard shortcut: hold `Shift` during drag to enable snap

**Agent:** `interaction-engineer`

**Skills:** `interaction-controllers`

**Acceptance:**
- With snap enabled, nodes align to grid
- Without snap, freeform positioning
- Shift key toggles mid-drag

---

## Task 6.8 — Implement copy/paste

Add commands:
- `CopyCommand` — serializes selected nodes + connecting edges to clipboard (private `_clipboard` on `CanvasState`, not system clipboard)
- `PasteCommand` — deserializes clipboard, offsets positions by (20, 20), creates new node IDs, adds to `CanvasState`
- Keyboard: Ctrl+C / Ctrl+V (Cmd on macOS)
- Duplicate: Ctrl+D — copy + immediate paste

**Agent:** `interaction-engineer` + `domain-engineer`

**Skills:** `interaction-controllers`, `canvas-state-management`

**Acceptance:**
- Copy 2 connected nodes → paste creates 2 new nodes with a new edge between them
- Pasted nodes offset so they don't overlap originals
- Paste assigns new unique IDs
- Undo paste removes all pasted nodes and edges

---

## Task 6.9 — Unit tests for copy/paste

Create `tests/unit/copy-paste.test.js`.

Test cases:
- Copy single node → paste creates new node at offset
- Copy 2 connected nodes → paste preserves edge between copies
- Pasted IDs are new (not duplicates)
- Paste with nothing copied → no-op
- Undo paste removes pasted items
- Copy from empty selection → no-op

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/copy-paste.test.js` — all pass

---

## Task 6.10 — CSS theming refinement

Extend `lib/theme.css`:
- Define complete dark theme via CSS custom properties under `[data-theme="dark"]`
- Verify all components use custom properties (no hard-coded colors)
- Add `prefers-color-scheme: dark` media query as default
- Transition: `transition: background-color 0.2s, color 0.2s, border-color 0.2s` on theme switch

Add theme toggle to `<toolbar>`:
- Button to switch between light/dark
- Sets `data-theme` attribute on `<app-shell>`

**Agent:** `component-engineer`

**Skills:** `web-components`

**Acceptance:**
- Dark theme applies cleanly to all components
- Theme toggle works
- No hard-coded colors in any component Shadow DOM

---

## Task 6.11 — Performance benchmark: 200 nodes

Create `tests/perf/benchmark-200.spec.js`.

Playwright test:
- Programmatically add 200 nodes in a grid layout via `CanvasState` API
- Connect each to its right neighbor (199 edges)
- Measure:
  - Initial render time (all nodes visible)
  - Pan across canvas: measure frame rate via `requestAnimationFrame` timestamps
  - Add 1 node: measure time to render
- Assert:
  - Initial render < 2000ms
  - Pan maintains > 30fps
  - Adding 1 node < 100ms

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/perf/benchmark-200.spec.js` — all assertions pass

---

## Task 6.12 — Performance benchmark: 500 nodes

Create `tests/perf/benchmark-500.spec.js`.

Same structure as 200-node benchmark:
- 500 nodes, 499 edges
- Assertions (relaxed):
  - Initial render < 5000ms
  - Pan > 20fps with virtualization enabled
  - Adding 1 node < 200ms

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/perf/benchmark-500.spec.js` — all pass

---

## Task 6.13 — Performance benchmark: 1000 nodes

Create `tests/perf/benchmark-1000.spec.js`.

- 1000 nodes, 999 edges
- Assertions:
  - Initial render < 10000ms
  - Pan > 15fps with virtualization
  - Virtualization culls at least 80% of nodes when zoomed in

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm exec playwright test tests/perf/benchmark-1000.spec.js` — all pass

---

## Task 6.14 — Final accessibility audit

Create `tests/e2e/final-a11y.spec.js`.

Run comprehensive axe scan on:
- Full app with 10 nodes, 5 edges, config drawer open
- Dark theme variant
- Assert zero violations in both

Keyboard-only navigation test:
- Tab through entire app without mouse
- All actions reachable
- Focus indicators visible throughout

**Agent:** `test-engineer`

**Skills:** `accessibility`, `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/final-a11y.spec.js` — zero violations

---

## Task 6.15 — Update `lib/index.js` with Phase 6 exports

Add exports:
- `ViewportCulling` from `./core/viewport-culling.js`
- `'./components/canvas-minimap.js'` (side-effect import)

**Agent:** `architect`

**Acceptance:**
- `ViewportCulling` importable from `lib/index.js`
- `<canvas-minimap>` registered on import

---

## Phase 6 Completion Checklist

- [ ] `<canvas-minimap>` renders overview with click/drag navigation
- [ ] Viewport virtualization culls off-screen nodes
- [ ] Snap-to-grid with Shift toggle
- [ ] Copy/paste/duplicate with new IDs and offset
- [ ] Dark theme with toggle, no hard-coded colors
- [ ] 200-node benchmark passes
- [ ] 500-node benchmark passes
- [ ] 1000-node benchmark passes
- [ ] Final accessibility audit passes
- [ ] `lib/index.js` updated
