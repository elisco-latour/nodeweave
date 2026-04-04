# Phase 1 — Viewport Culling

> Parent plan: `plan-wireframeMinimapPngThemeCulling.prompt.md`
> Dependencies: none
> Parallel with: Phase 2 (Theme Toggle)

---

## Goal

Hide off-screen `<wf-node>` elements and their edges so the wireframe canvas stays performant at scale. The library already provides `ViewportCulling.getVisibleNodes()` — this phase wires it into the wireframe workspace.

## Tasks

### 1. Add culling to `wireframe/components/wf-workspace.js`

- Import `ViewportCulling` from `../../lib/core/viewport-culling.js`
- Add private method `#getViewportBounds()`:
  - Read `this.#state.viewport` → `{ panX, panY, zoom }`
  - Read `this.getBoundingClientRect()` → `{ width, height }` (fallback `1200 × 800`)
  - Return `{ x: -panX / zoom, y: -panY / zoom, width: w / zoom, height: h / zoom }`
  - Reference: `lib/components/canvas-workspace.js` lines 99–107
- Add private method `#updateCulling()`:
  - Call `ViewportCulling.getVisibleNodes(this.#state, this.#getViewportBounds())`
  - Iterate all stored `<wf-node>` element references
  - Set `el.style.display = 'none'` for nodes NOT in the visible set
  - Reset `el.style.display = ''` for nodes IN the visible set
  - Call `this.#edgeLayer.setVisibleNodes(visibleIds)` if the edge layer exposes that method
- Hook `#updateCulling()` into existing event handlers for:
  - `viewport-changed`
  - `node-added`
  - `node-removed`
  - `node-moved`

### 2. Add `setVisibleNodes(ids)` to `wireframe/components/wf-edge-layer.js`

- Accept a `Set<string>` of visible node IDs
- Store as `this.#visibleNodes`
- On next render / edge update, skip `<path>` elements where **neither** the source node nor the target node is in the visible set
- If `#visibleNodes` is `null` (not yet set), render all edges (backwards-compatible default)

### 3. Test: viewport culling in wf-workspace

**File:** `tests/component/wf-viewport-culling.spec.js`
**Fixture:** `tests/component/fixtures/wf-viewport-culling-fixture.html`

- Mount `<wf-workspace>` with a `CanvasState` containing nodes at various positions
- Set viewport to show only a portion of the canvas
- Assert: nodes outside the viewport have `display: none`
- Assert: nodes inside the viewport have `display: ''` (visible)
- Pan viewport to reveal hidden nodes → assert they become visible
- Assert: edge layer's `setVisibleNodes()` is called with correct node ID set

**Run:** `pnpm exec playwright test tests/component/wf-viewport-culling.spec.js`

## Files

| Action | File | What changes |
|--------|------|------|
| Modify | `wireframe/components/wf-workspace.js` | Import `ViewportCulling`, add `#getViewportBounds()`, `#updateCulling()`, hook into event handlers |
| Modify | `wireframe/components/wf-edge-layer.js` | Add `setVisibleNodes(ids)` method, filter edge paths |
| Create | `tests/component/wf-viewport-culling.spec.js` | Component test for viewport culling |
| Create | `tests/component/fixtures/wf-viewport-culling-fixture.html` | Test fixture |

## Reference (read, don't modify)

- `lib/core/viewport-culling.js` — `static getVisibleNodes(canvasState, viewportBounds)` returns `string[]`
- `lib/components/canvas-workspace.js` lines 79–107 — reference implementation of culling + viewport bounds

## Verification

- `pnpm exec playwright test tests/component/wf-viewport-culling.spec.js` — culling component test passes
- `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js` — existing E2E still passes
- Manual: open wireframe, add several nodes, zoom out until some are off-screen
- Inspect DOM: off-screen `<wf-node>` elements should have `display: none`
- Edges connected to hidden nodes should not render
- Zoom/pan back — nodes and edges reappear
