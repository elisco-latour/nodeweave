# Phase 3 — Minimap

> Parent plan: `plan-wireframeMinimapPngThemeCulling.prompt.md`
> Dependencies: Phase 1 (Viewport Culling), Phase 2 (Theme Toggle — for `--vc-*` CSS var mapping)

---

## Goal

Add a minimap overview to the wireframe app by reusing the library's `<canvas-minimap>` component directly. The lib component is consumer-agnostic — it accepts `canvasState` and `visualRegistry` as property setters and renders to an internal `<canvas>`.

## Tasks

### 7. Wire `<canvas-minimap>` in `wf-shell.js`

- Add side-effect import: `import '../../lib/components/canvas-minimap.js'`
  - This registers **only** `<canvas-minimap>`, not the entire `lib/components.js` barrel
- Add `<canvas-minimap>` element to the shell shadow DOM template
- Position via shell CSS: `canvas-minimap { position: fixed; bottom: 16px; left: 16px; z-index: 100; }`
- In `connectedCallback` (after state and registries are initialized):
  ```js
  const minimap = this.shadowRoot.querySelector('canvas-minimap');
  minimap.canvasState = this.#state;
  minimap.visualRegistry = this.#visualRegistry;
  ```
- **Registry compatibility check:** `<canvas-minimap>` calls `visualRegistry.get(node.type).color` to color nodes. Verify `WfVisualRegistry` entries include a `color` property. They should — wireframe visual entries use `{ label, icon, color }` format via the base `Registry` class.

### 8. Style the minimap container

- Add shell CSS for the minimap wrapper:
  - `border-radius: 8px`
  - `box-shadow: 0 2px 8px var(--wf-shadow, rgba(0,0,0,0.15))`
  - `overflow: hidden` (clips the canvas corners)
  - `border: 1px solid var(--wf-border, #e2e8f0)`
- The minimap reads `--vc-toolbar-border` and `--vc-node-bg` from CSS custom properties
- Phase 2's `theme.css` maps these: `--vc-toolbar-border: var(--wf-border)` and `--vc-node-bg: var(--wf-bg-surface)`
- Dark theme: minimap background, node colors, and viewport indicator all respect the mapped vars

### 9. Test: minimap integration

**File:** `tests/e2e/wf-minimap.spec.js`

- Navigate to wireframe app
- Assert `<canvas-minimap>` is visible (bottom-left area)
- Add nodes via palette → verify minimap's `<canvas>` element updates (check canvas is not blank via pixel sampling or dimension check)
- Click on a position in the minimap → assert workspace viewport pans (check `--pan-x` / `--pan-y` CSS properties change)
- Toggle theme → assert minimap container border/shadow respond to theme vars

**Run:** `pnpm exec playwright test tests/e2e/wf-minimap.spec.js`

## Files

| Action | File | What changes |
|--------|------|------|
| Modify | `wireframe/components/wf-shell.js` | Import `canvas-minimap.js`, add element to template, wire `canvasState` + `visualRegistry`, add positioning CSS |
| Create | `tests/e2e/wf-minimap.spec.js` | E2E test for minimap integration |

## Reference (read, don't modify)

- `lib/components/canvas-minimap.js` — Full implementation. Property setters: `canvasState`, `visualRegistry`. Events listened: `node-added`, `node-removed`, `node-moved`, `viewport-changed`, `state-reset`. Click/drag on minimap calls `state.setViewport()`.
- `wireframe/registries.js` — Verify `WfVisualRegistry` entries have `.color` property

## API Contract

The minimap expects:

| Property | Type | What it reads |
|----------|------|---------------|
| `canvasState` | `CanvasState` | `.nodes`, `.edges`, `.getPort(id)`, `.viewport`, `.setViewport(panX, panY, zoom)` |
| `visualRegistry` | object with `.get(type)` | `.get(nodeType).color` → hex color string |

## Verification

- `pnpm exec playwright test tests/e2e/wf-minimap.spec.js` — minimap E2E test passes
- `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js` — existing E2E still passes
- Manual: open wireframe — minimap appears bottom-left corner with rounded border and shadow
- Add nodes via palette — they appear as colored rectangles in the minimap
- Connect edges — they appear as lines in the minimap
- Pan/zoom the workspace — viewport indicator (blue rectangle) moves/resizes in the minimap
- Click on the minimap — workspace pans to that location
- Drag on the minimap — workspace follows the drag
- Toggle theme — minimap respects dark/light colors
